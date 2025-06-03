import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { storage } from "./storage";
import { generateFlashcards } from "./ai-service";
import { extractTextWithOCR } from "./ocr-service";
import { cacheService } from "./cache-service";
import { preprocessingService } from "./preprocessing-service";
import { exportService } from "./export-service";
import { verifyFirebaseToken, requireEmailVerification, AuthenticatedRequest } from "./firebase-auth";
import { insertFlashcardJobSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase Auth routes
  app.post('/api/auth/sync', verifyFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { uid, email, displayName, photoURL, emailVerified, provider } = req.body;
      
      const userData = await storage.upsertUser({
        id: uid,
        email,
        displayName,
        photoURL,
        provider,
        isEmailVerified: emailVerified,
        updatedAt: new Date()
      });
      
      res.json(userData);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

  app.get('/api/auth/user', verifyFirebaseToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Check upload limits middleware
  const checkUploadLimits = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user!.uid;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check email verification
      if (!user.isEmailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email to continue",
          requiresEmailVerification: true 
        });
      }

      // Check upload limits
      const { canUpload, uploadsRemaining } = await storage.checkUploadLimit(userId);
      if (!canUpload) {
        return res.status(429).json({ 
          message: "You've reached your monthly limit. Upgrade to generate more flashcards.",
          isPremium: user.isPremium,
          monthlyUploads: user.monthlyUploads,
          monthlyLimit: user.monthlyLimit,
          requiresUpgrade: true
        });
      }

      req.uploadsRemaining = uploadsRemaining;
      next();
    } catch (error) {
      console.error("Upload limit check error:", error);
      res.status(500).json({ message: "Failed to check upload limits" });
    }
  };

  // Upload PDF and start processing (with auth and rate limiting)
  app.post("/api/upload", isAuthenticated, checkUploadLimits, upload.single("pdf"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      const userId = req.user.claims.sub;
      const {
        apiProvider,
        flashcardCount,
        subject,
        focusAreas,
        difficulty,
      } = req.body;

      // Validate input
      const jobData = {
        userId,
        filename: req.file.originalname,
        fileSize: req.file.size,
        apiProvider,
        flashcardCount: parseInt(flashcardCount),
        status: "pending" as const,
        progress: 0,
        currentTask: "Starting processing...",
      };

      // Create job record
      const job = await storage.createFlashcardJob(jobData);

      // Increment user upload count
      await storage.incrementUserUploads(userId);

      // Start processing asynchronously
      processFlashcardJob(job.id, req.file.path, apiProvider, subject, focusAreas, difficulty);

      res.json({ 
        jobId: job.id, 
        status: "pending",
        uploadsRemaining: req.uploadsRemaining - 1
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Get job status
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Job status error:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // Download Anki deck
  app.get("/api/download/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || !job.ankiDeckPath) {
        return res.status(404).json({ message: "Anki deck not ready" });
      }

      const filePath = job.ankiDeckPath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Anki deck file not found" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="StudyCards_${jobId}.apkg"`);
      res.setHeader('Content-Type', 'application/vnd.anki');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Export flashcards in multiple formats
  app.get("/api/export/:id/:format", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const format = req.params.format as 'csv' | 'json' | 'quizlet';
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || !job.flashcards) {
        return res.status(404).json({ message: "Flashcards not ready" });
      }

      const flashcards = JSON.parse(job.flashcards);
      const outputDir = path.join("outputs", `job_${jobId}`);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let filePath: string;
      let contentType: string;
      let filename: string;

      switch (format) {
        case 'csv':
          filePath = await exportService.exportToCSV(flashcards, outputDir);
          contentType = 'text/csv';
          filename = `StudyCards_${jobId}.csv`;
          break;
        case 'json':
          filePath = await exportService.exportToJSON(flashcards, outputDir);
          contentType = 'application/json';
          filename = `StudyCards_${jobId}.json`;
          break;
        case 'quizlet':
          filePath = await exportService.exportToQuizlet(flashcards, outputDir);
          contentType = 'text/plain';
          filename = `StudyCards_${jobId}_quizlet.txt`;
          break;
        default:
          return res.status(400).json({ message: "Unsupported format" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Get flashcard statistics
  app.get("/api/stats/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || job.status !== "completed" || !job.flashcards) {
        return res.status(404).json({ message: "Flashcards not ready" });
      }

      const flashcards = JSON.parse(job.flashcards);
      const stats = exportService.generateStudyStats(flashcards);
      
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to generate stats" });
    }
  });

  // Get user's job history
  app.get("/api/user/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getUserJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("User jobs error:", error);
      res.status(500).json({ message: "Failed to get user jobs" });
    }
  });

  // Upgrade to premium
  app.post("/api/user/upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.upgradeToPremium(userId);
      
      const updatedUser = await storage.getUser(userId);
      res.json({ message: "Successfully upgraded to premium", user: updatedUser });
    } catch (error) {
      console.error("Upgrade error:", error);
      res.status(500).json({ message: "Failed to upgrade account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Background processing function
async function processFlashcardJob(
  jobId: number,
  pdfPath: string,
  apiProvider: string,
  subject: string,
  focusAreas: string,
  difficulty: string
) {
  try {
    // Update job status
    await storage.updateFlashcardJob(jobId, {
      status: "processing",
      progress: 10,
      currentTask: "Extracting text from PDF...",
    });

    // Extract text from PDF with OCR support
    const ocrResult = await extractTextWithOCR(pdfPath);
    const extractedText = ocrResult.text;
    
    if (ocrResult.isScanned) {
      await storage.updateFlashcardJob(jobId, {
        progress: 25,
        currentTask: `OCR processing completed (${Math.round(ocrResult.confidence * 100)}% confidence)`,
      });
    } else {
      await storage.updateFlashcardJob(jobId, {
        progress: 25,
        currentTask: "Text extraction completed",
      });
    }

    // Check cache first to avoid unnecessary API calls
    const contentHash = cacheService.generateContentHash(extractedText, subject, difficulty, focusAreas || "{}");
    const cachedFlashcards = await cacheService.getCachedFlashcards(contentHash);
    
    let flashcards;
    
    if (cachedFlashcards) {
      flashcards = cachedFlashcards;
      await storage.updateFlashcardJob(jobId, {
        progress: 80,
        currentTask: "Retrieved from cache (cost-optimized)",
        flashcards: JSON.stringify(flashcards),
      });
    } else {
      // Preprocess content for cost optimization
      await storage.updateFlashcardJob(jobId, {
        progress: 30,
        currentTask: "Preprocessing content for cost optimization...",
      });

      const preprocessResult = preprocessingService.preprocessContent(extractedText, subject);
      
      await storage.updateFlashcardJob(jobId, {
        progress: 35,
        currentTask: `Content optimized (Est. cost: $${preprocessResult.estimatedCost.toFixed(3)})`,
      });

      // Generate flashcards using AI with optimized content
      await storage.updateFlashcardJob(jobId, {
        progress: 40,
        currentTask: "Analyzing content with AI...",
      });

      const job = await storage.getFlashcardJob(jobId);
      if (!job) throw new Error("Job not found");

      // Get system-managed API key based on provider
      const systemApiKey = apiProvider === "openai" 
        ? process.env.OPENAI_API_KEY 
        : process.env.ANTHROPIC_API_KEY;
      
      if (!systemApiKey) {
        throw new Error(`${apiProvider.toUpperCase()} API key not configured`);
      }

      flashcards = await generateFlashcards(
        preprocessResult.filteredContent,
        job.apiProvider as "openai" | "anthropic",
        systemApiKey,
        job.flashcardCount,
        subject,
        JSON.parse(focusAreas || "{}"),
        difficulty
      );

      // Cache the results for future use
      await cacheService.cacheFlashcards(
        contentHash,
        extractedText,
        subject,
        flashcards,
        difficulty,
        focusAreas || "{}"
      );

      await storage.updateFlashcardJob(jobId, {
        progress: 75,
        currentTask: "Creating flashcard pairs",
        flashcards: JSON.stringify(flashcards),
      });
    }

    // Generate Anki deck using Python
    await storage.updateFlashcardJob(jobId, {
      progress: 90,
      currentTask: "Generating Anki deck",
    });

    const ankiDeckPath = await generateAnkiDeck(jobId, flashcards);

    // Complete the job
    await storage.updateFlashcardJob(jobId, {
      status: "completed",
      progress: 100,
      currentTask: "Anki deck ready for download",
      ankiDeckPath,
    });

    // Clean up uploaded PDF
    fs.unlinkSync(pdfPath);
  } catch (error) {
    console.error("Processing error:", error);
    await storage.updateFlashcardJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
    });
    
    // Clean up uploaded PDF
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  }
}

// Extract text from PDF using Python subprocess
function extractTextFromPDF(pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", ["server/pdf-processor.py", pdfPath]);
    
    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(result.trim());
      } else {
        reject(new Error(`PDF processing failed: ${error}`));
      }
    });
  });
}

// Generate Anki deck using Python subprocess
function generateAnkiDeck(jobId: number, flashcards: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join("outputs", `deck_${jobId}.apkg`);
    const flashcardsJson = JSON.stringify(flashcards);
    
    const pythonProcess = spawn("python3", [
      "server/anki-generator.py",
      flashcardsJson,
      outputPath
    ]);

    let error = "";

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Anki deck generation failed: ${error}`));
      }
    });
  });
}