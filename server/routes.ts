import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { storage } from "./storage";
import { generateFlashcards } from "./ai-service";
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
  // Upload PDF and start processing
  app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      const {
        apiProvider,
        flashcardCount,
        focusAreas,
        difficulty,
      } = req.body;

      // Validate input
      const jobData = {
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

      // Start processing asynchronously
      processFlashcardJob(job.id, req.file.path, apiProvider, focusAreas, difficulty);

      res.json({ jobId: job.id, status: "pending" });
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
      console.error("Get job error:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // Download Anki deck
  app.get("/api/download/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || job.status !== "completed" || !job.ankiDeckPath) {
        return res.status(404).json({ message: "Anki deck not ready" });
      }

      const filePath = job.ankiDeckPath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Anki deck file not found" });
      }

      const filename = `Python_Syntax_Flashcards_${job.id}.apkg`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "application/octet-stream");
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
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

    // Extract text from PDF using Python
    const extractedText = await extractTextFromPDF(pdfPath);
    
    await storage.updateFlashcardJob(jobId, {
      progress: 25,
      currentTask: "Text extraction completed",
    });

    // Generate flashcards using AI
    await storage.updateFlashcardJob(jobId, {
      progress: 30,
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

    const flashcards = await generateFlashcards(
      extractedText,
      job.apiProvider as "openai" | "anthropic",
      systemApiKey,
      job.flashcardCount,
      JSON.parse(focusAreas || "{}"),
      difficulty
    );

    await storage.updateFlashcardJob(jobId, {
      progress: 75,
      currentTask: "Creating flashcard pairs",
      flashcards: JSON.stringify(flashcards),
    });

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
    const pythonProcess = spawn("python3", [
      path.join(process.cwd(), "server/pdf-processor.py"),
      pdfPath,
    ]);

    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`PDF extraction failed: ${error}`));
      }
    });
  });
}

// Generate Anki deck using Python subprocess
function generateAnkiDeck(jobId: number, flashcards: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), "outputs", `deck_${jobId}.apkg`);
    
    // Ensure outputs directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pythonProcess = spawn("python3", [
      path.join(process.cwd(), "server/anki-generator.py"),
      JSON.stringify(flashcards),
      outputPath,
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
