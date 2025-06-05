import express, { type Express } from "express";
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
import { objectStorage } from "./object-storage-service";
import { verifyFirebaseToken, requireEmailVerification, AuthenticatedRequest } from "./firebase-auth";
import { requireApiKeys, getAvailableProvider, validateApiKeys, logApiKeyStatus } from "./api-key-validator";

// AI Model mapping for quality tiers
const modelMap = {
  basic: 'anthropic', // Claude 3.5 Haiku
  advanced: 'openai'  // GPT-4o Mini
} as const;

// Enforce AI model selection based on user tier
function enforceAIModelAccess(userIsPremium: boolean, requestedTier: string): "openai" | "anthropic" {
  const tier = requestedTier as keyof typeof modelMap;
  
  // Free users can only use basic tier
  if (!userIsPremium || tier === 'basic') {
    return modelMap.basic;
  }
  
  // Premium users can use advanced tier
  if (userIsPremium && tier === 'advanced') {
    return modelMap.advanced;
  }
  
  // Default to basic for any invalid input
  return modelMap.basic;
}
import { insertFlashcardJobSchema, users, flashcardJobs } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { z } from "zod";
import Stripe from "stripe";

// Configure multer for multiple file uploads with role-based limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Maximum 10 files (will be restricted by user role)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Raw body middleware for Stripe webhooks
  app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
  
  // JSON middleware for all other routes
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  // Firebase Auth routes
  app.post('/api/auth/sync', verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
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

  app.get('/api/auth/user', verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
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

  // Enhanced upload validation middleware with file count limits
  const validateFileUploads = async (req: any, res: any, next: any) => {
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

      // Check monthly upload limits
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

      // Role-based file count validation
      const files = req.files || [];
      const fileCount = files.length;
      
      if (user.isPremium) {
        // Premium users: up to 10 files
        if (fileCount > 10) {
          return res.status(400).json({
            message: "Premium users can upload up to 10 files at once",
            maxFiles: 10,
            uploadedFiles: fileCount,
            userType: "premium"
          });
        }
      } else {
        // Free users: only 1 file
        if (fileCount > 1) {
          return res.status(400).json({
            message: "Free users can only upload 1 file at a time. Upgrade to Pro for bulk uploads.",
            maxFiles: 1,
            uploadedFiles: fileCount,
            userType: "free",
            requiresUpgrade: true
          });
        }
      }

      // Validate each file size (10MB max per file)
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      for (const file of files) {
        if (file.size > maxFileSize) {
          return res.status(400).json({
            message: `File "${file.originalname}" exceeds 10MB limit`,
            fileSize: file.size,
            maxFileSize,
            fileName: file.originalname
          });
        }
      }

      req.uploadsRemaining = uploadsRemaining;
      req.userType = user.isPremium ? "premium" : "free";
      next();
    } catch (error) {
      console.error("File upload validation error:", error);
      res.status(500).json({ message: "Failed to validate file uploads" });
    }
  };

  // Upload PDF(s) and start processing (with auth, rate limiting, and API key validation)
  app.post("/api/upload", verifyFirebaseToken as any, validateFileUploads as any, requireApiKeys, upload.array("pdfs", 10), async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No PDF files uploaded" });
      }

      const userId = req.user!.uid;
      const {
        apiProvider,
        flashcardCount,
        subject,
        focusAreas,
        difficulty,
        customContext,
      } = req.body;

      // Server-side input validation
      const count = parseInt(flashcardCount);
      if (isNaN(count) || count < 1 || count > 100) {
        return res.status(400).json({ 
          message: "Invalid flashcard count. Must be between 1 and 100.",
          field: "flashcardCount",
          value: flashcardCount
        });
      }

      if (!subject || !subject.trim()) {
        return res.status(400).json({ 
          message: "Subject is required.",
          field: "subject"
        });
      }

      if (!['basic', 'advanced'].includes(apiProvider)) {
        return res.status(400).json({ 
          message: "Invalid AI quality level.",
          field: "apiProvider",
          value: apiProvider
        });
      }

      if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
        return res.status(400).json({ 
          message: "Invalid difficulty level.",
          field: "difficulty",
          value: difficulty
        });
      }

      // Get user for premium status check
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate premium access for advanced models
      if (apiProvider === 'advanced' && !user.isPremium) {
        return res.status(403).json({ 
          message: "Advanced AI quality requires a Premium subscription.",
          field: "apiProvider",
          requiresUpgrade: true
        });
      }

      // Enforce AI model access based on user tier
      const enforcedProvider = enforceAIModelAccess(Boolean(user.isPremium), apiProvider);
      
      // Get available provider with fallback
      const validation = (req as any).apiKeyValidation;
      const selectedProvider = getAvailableProvider(enforcedProvider, validation);
      
      if (!selectedProvider) {
        return res.status(503).json({ 
          message: "AI services are temporarily unavailable",
          error: "no_available_providers",
          requestedProvider: apiProvider,
          availableProviders: validation.availableProviders
        });
      }

      // Process multiple files - create a job for each file
      const createdJobs = [];
      
      for (const file of files) {
        // Validate input for each file
        const jobData = {
          userId,
          filename: file.originalname,
          fileSize: file.size,
          apiProvider: enforcedProvider,
          flashcardCount: parseInt(flashcardCount),
          subject: subject || "general",
          difficulty: difficulty || "intermediate",
          focusAreas: JSON.stringify(focusAreas || {}),
          status: "pending" as const,
          progress: 0,
          currentTask: enforcedProvider !== selectedProvider 
            ? `Starting processing with ${selectedProvider} (fallback from ${enforcedProvider})...`
            : "Starting processing...",
        };

        // Create job record
        const job = await storage.createFlashcardJob(jobData);
        createdJobs.push(job);

        // Start processing asynchronously with selected provider
        processFlashcardJob(job.id, file.buffer, file.originalname, selectedProvider, subject, focusAreas, difficulty, userId, flashcardCount, customContext);
      }

      // Increment user upload count once for the batch
      await storage.incrementUserUploads(userId);

      res.json({ 
        jobs: createdJobs.map(job => ({
          jobId: job.id,
          filename: job.filename,
          status: job.status
        })),
        totalFiles: files.length,
        userType: req.userType,
        uploadsRemaining: (req as any).uploadsRemaining - 1
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

  // Delete job and associated files
  app.delete("/api/jobs/:id", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.uid;
      
      // Get job to verify ownership and get file keys
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Verify user owns this job
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Access denied. You can only delete your own jobs." });
      }
      
      // Delete files from object storage
      const filesToDelete = [
        job.pdfStorageKey,
        job.ankiStorageKey,
        job.csvStorageKey,
        job.jsonStorageKey,
        job.quizletStorageKey
      ].filter(Boolean); // Remove null/undefined values
      
      let deletedFiles = 0;
      for (const fileKey of filesToDelete) {
        try {
          const deleted = await objectStorage.deleteFile(fileKey as string);
          if (deleted) deletedFiles++;
        } catch (error) {
          console.error(`Failed to delete file ${fileKey}:`, error);
          // Continue with other files even if one fails
        }
      }
      
      // Delete job from database
      const deleted = await storage.deleteFlashcardJob(jobId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete job from database" });
      }
      
      res.json({ 
        message: "Job deleted successfully",
        deletedFiles,
        totalFiles: filesToDelete.length
      });
      
    } catch (error) {
      console.error("Job deletion error:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Download Anki deck
  app.get("/api/download/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || !job.ankiStorageKey) {
        return res.status(404).json({ message: "Anki deck not ready" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="StudyCards_${jobId}.apkg"`);
      res.setHeader('Content-Type', 'application/vnd.anki');
      
      const stream = await objectStorage.downloadFileStream(job.ankiStorageKey);
      stream.pipe(res);
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Get user's upload history
  app.get("/api/history", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const jobs = await storage.getUserJobs(userId);
      
      // Format the response with essential information
      const formattedJobs = jobs.map(job => ({
        id: job.id,
        filename: job.filename,
        fileSize: job.fileSize,
        subject: job.subject,
        difficulty: job.difficulty,
        status: job.status,
        progress: job.progress,
        flashcardCount: job.flashcardCount,
        apiProvider: job.apiProvider,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        processingTime: job.processingTime,
        hasFlashcards: !!job.flashcards,
        hasAnkiDeck: !!job.ankiStorageKey,
        hasCsvExport: !!job.csvStorageKey,
        hasJsonExport: !!job.jsonStorageKey,
        hasQuizletExport: !!job.quizletStorageKey,
        errorMessage: job.errorMessage
      }));

      res.json(formattedJobs);
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({ message: "Failed to fetch upload history" });
    }
  });

  // Get user's flashcard decks for study page
  app.get("/api/decks", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      
      // Get completed jobs with flashcards
      const jobs = await storage.getUserJobs(userId);
      const completedJobs = jobs.filter(job => 
        job.status === 'completed' && job.flashcards && job.flashcards.trim() !== ''
      );

      // Transform jobs into deck format with metadata
      const decks = completedJobs.map(job => {
        let flashcardCount = 0;
        let previewCards = [];
        
        try {
          if (job.flashcards) {
            const flashcards = JSON.parse(job.flashcards);
            flashcardCount = Array.isArray(flashcards) ? flashcards.length : 0;
            previewCards = Array.isArray(flashcards) ? flashcards.slice(0, 3) : [];
          }
        } catch (error) {
          console.error(`Failed to parse flashcards for job ${job.id}:`, error);
        }

        return {
          id: job.id,
          name: job.filename.replace(/\.[^/.]+$/, ""), // Remove file extension
          filename: job.filename,
          subject: job.subject,
          difficulty: job.difficulty,
          cardCount: flashcardCount,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          apiProvider: job.apiProvider,
          previewCards,
          hasFlashcards: flashcardCount > 0
        };
      });

      res.json(decks);
    } catch (error) {
      console.error("Decks fetch error:", error);
      res.status(500).json({ message: "Failed to fetch flashcard decks" });
    }
  });

  // Download original PDF file
  app.get("/api/download/pdf/:id", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.uid;
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!job.pdfStorageKey) {
        return res.status(404).json({ message: "Original file no longer available" });
      }

      if (!(await objectStorage.fileExists(job.pdfStorageKey))) {
        return res.status(404).json({ message: "Original file no longer available" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      
      const stream = await objectStorage.downloadFileStream(job.pdfStorageKey);
      stream.pipe(res);
    } catch (error) {
      console.error("PDF download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Object Storage download endpoint - simplified for direct access
  app.get("/api/object-storage/download/:key(*)", async (req: Request, res) => {
    try {
      const storageKey = req.params.key;
      
      // Only allow downloads from user directories (security check)
      if (!storageKey.startsWith('users/')) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!(await objectStorage.fileExists(storageKey))) {
        return res.status(404).json({ message: "File not found" });
      }

      // Determine content type based on file extension
      const ext = path.extname(storageKey).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.apkg': 'application/octet-stream',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.txt': 'text/plain'
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';
      const filename = path.basename(storageKey);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      
      const stream = await objectStorage.downloadFileStream(storageKey);
      stream.pipe(res);
    } catch (error) {
      console.error("Object Storage download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Export flashcards in multiple formats (redirects to Object Storage)
  app.get("/api/export/:id/:format", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const format = req.params.format as 'csv' | 'json' | 'quizlet';
      const userId = req.user!.uid;
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!job.flashcards) {
        return res.status(404).json({ message: "Flashcards not ready" });
      }

      // Get the appropriate storage key based on format
      let storageKey: string | undefined;
      let filename: string;
      let contentType: string;

      switch (format) {
        case 'csv':
          storageKey = job.csvStorageKey ?? undefined;
          filename = `StudyCards_${jobId}.csv`;
          contentType = 'text/csv';
          break;
        case 'json':
          storageKey = job.jsonStorageKey ?? undefined;
          filename = `StudyCards_${jobId}.json`;
          contentType = 'application/json';
          break;
        case 'quizlet':
          storageKey = job.quizletStorageKey ?? undefined;
          filename = `StudyCards_${jobId}_quizlet.txt`;
          contentType = 'text/plain';
          break;
        default:
          return res.status(400).json({ message: "Unsupported format" });
      }

      if (!storageKey) {
        return res.status(404).json({ message: "Export file not available" });
      }

      if (!(await objectStorage.fileExists(storageKey))) {
        return res.status(404).json({ message: "Export file not found" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', contentType);
      
      const stream = await objectStorage.downloadFileStream(storageKey);
      stream.pipe(res);
      
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
  app.get("/api/user/jobs", verifyFirebaseToken as any, async (req: any, res) => {
    try {
      const userId = req.user!.uid;
      const jobs = await storage.getUserJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("User jobs error:", error);
      res.status(500).json({ message: "Failed to get user jobs" });
    }
  });

  // Stripe checkout session creation
  app.post("/api/create-checkout-session", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isPremium) {
        return res.status(400).json({ message: "User is already premium" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            firebaseUID: userId,
          },
        });
        customerId = customer.id;
        await storage.updateStripeCustomerId(userId, customerId);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'StudyCards Pro',
                description: '100 uploads per month + advanced features',
              },
              unit_amount: 999, // $9.99 in cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/`,
        metadata: {
          firebaseUID: userId,
        },
      });

      console.log(`Created checkout session ${session.id} for user ${userId} with customer ${customerId}`);

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout session error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Study progress tracking endpoints
  app.get("/api/study-progress/:jobId", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user!.uid;

      const progress = await storage.getStudyProgress(userId, jobId);
      const stats = await storage.getStudyStats(userId, jobId);

      res.json({ progress, stats });
    } catch (error) {
      console.error("Error fetching study progress:", error);
      res.status(500).json({ error: "Failed to fetch study progress" });
    }
  });

  app.post("/api/study-progress", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { jobId, cardIndex, status, difficultyRating } = req.body;
      const userId = req.user!.uid;

      const progressData = {
        userId,
        jobId,
        cardIndex,
        status,
        difficultyRating,
        lastReviewedAt: new Date(),
        nextReviewDate: calculateNextReviewDate(status, difficultyRating)
      };

      const updatedProgress = await storage.updateStudyProgress(progressData);
      res.json(updatedProgress);
    } catch (error) {
      console.error("Error updating study progress:", error);
      res.status(500).json({ error: "Failed to update study progress" });
    }
  });

  // Update flashcards endpoint
  app.put("/api/jobs/:id/flashcards", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.uid;
      const { flashcards } = req.body;

      // Verify job ownership
      const job = await storage.getFlashcardJob(jobId);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ error: "Job not found or access denied" });
      }

      // Update flashcards
      const updatedJob = await storage.updateFlashcardJob(jobId, {
        flashcards,
        updatedAt: new Date()
      });

      res.json({ success: true, job: updatedJob });
    } catch (error) {
      console.error("Error updating flashcards:", error);
      res.status(500).json({ error: "Failed to update flashcards" });
    }
  });

  // Regenerate flashcards endpoint
  app.post("/api/regenerate/:jobId", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user!.uid;
      const { customContext } = req.body;

      // Get original job
      const originalJob = await storage.getFlashcardJob(jobId);
      if (!originalJob || originalJob.userId !== userId) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check upload limits
      const uploadCheck = await storage.checkUploadLimit(userId);
      if (!uploadCheck.canUpload) {
        return res.status(403).json({ 
          error: "Upload limit reached", 
          uploadsRemaining: uploadCheck.uploadsRemaining 
        });
      }

      // Create new job based on original
      const newJobData = {
        userId,
        filename: `Regenerated - ${originalJob.filename}`,
        fileSize: originalJob.fileSize,
        subject: originalJob.subject,
        difficulty: originalJob.difficulty,
        flashcardCount: originalJob.flashcardCount,
        status: "pending" as const,
        apiProvider: originalJob.apiProvider,
        focusAreas: customContext ? JSON.stringify({ custom: customContext }) : originalJob.focusAreas,
        pdfStorageKey: originalJob.pdfStorageKey,
        pdfDownloadUrl: originalJob.pdfDownloadUrl,
        regeneratedFromJobId: originalJob.id
      };

      const newJob = await storage.createFlashcardJob(newJobData);
      await storage.incrementUserUploads(userId);

      // Start processing in background
      processRegeneratedFlashcardJob(newJob.id, originalJob.pdfStorageKey!, customContext);

      res.json({ jobId: newJob.id, status: "started" });
    } catch (error) {
      console.error("Error regenerating flashcards:", error);
      res.status(500).json({ error: "Failed to regenerate flashcards" });
    }
  });

  // Admin metrics endpoint
  app.get("/api/admin/metrics", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const user = await storage.getUser(userId);
      
      // Check if user has admin role
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      // Get all users count
      const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalUsers = totalUsersResult[0]?.count || 0;

      // Get total jobs count
      const totalJobsResult = await db.select({ count: sql<number>`count(*)` }).from(flashcardJobs);
      const totalJobs = totalJobsResult[0]?.count || 0;

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsersResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`);
      
      const recentJobsResult = await db.select({ count: sql<number>`count(*)` })
        .from(flashcardJobs)
        .where(sql`${flashcardJobs.createdAt} >= ${thirtyDaysAgo}`);

      // Get API provider usage (simplified calculation)
      const openaiJobsResult = await db.select({ count: sql<number>`count(*)` })
        .from(flashcardJobs)
        .where(eq(flashcardJobs.apiProvider, 'openai'));
      
      const anthropicJobsResult = await db.select({ count: sql<number>`count(*)` })
        .from(flashcardJobs)
        .where(eq(flashcardJobs.apiProvider, 'anthropic'));

      const openaiJobs = openaiJobsResult[0]?.count || 0;
      const anthropicJobs = anthropicJobsResult[0]?.count || 0;

      // Calculate estimated storage (simplified)
      const storageResult = await db.select({ 
        totalSize: sql<number>`sum(${flashcardJobs.fileSize})` 
      }).from(flashcardJobs);
      
      const totalBytes = storageResult[0]?.totalSize || 0;
      const storageUsed = formatBytes(totalBytes);

      const metrics = {
        totalUsers,
        totalJobs,
        storageUsed,
        apiCalls: {
          openai: openaiJobs * 2, // Estimated API calls per job
          anthropic: anthropicJobs * 2,
          total: (openaiJobs + anthropicJobs) * 2
        },
        recentActivity: {
          period: "Last 30 days",
          newUsers: recentUsersResult[0]?.count || 0,
          jobsGenerated: recentJobsResult[0]?.count || 0
        }
      };

      res.json(metrics);
    } catch (error) {
      console.error("Admin metrics error:", error);
      res.status(500).json({ error: "Failed to fetch admin metrics" });
    }
  });

  // Stripe webhook handler with enhanced validation and logging
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    // Enhanced webhook secret validation
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not configured - webhook processing disabled");
      return res.status(500).json({ 
        error: "webhook_not_configured",
        message: "Stripe webhook endpoint is not properly configured" 
      });
    }

    if (!sig) {
      console.error("❌ Missing Stripe signature header");
      return res.status(400).json({ 
        error: "missing_signature",
        message: "Stripe signature header is required" 
      });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log(`✅ Webhook verified: ${event.type} (ID: ${event.id})`);
    } catch (err: any) {
      console.error("❌ Webhook signature verification failed:", err.message);
      console.error("Signature:", sig);
      console.error("Body length:", req.body.length);
      return res.status(400).json({ 
        error: "invalid_signature",
        message: `Webhook signature verification failed: ${err.message}` 
      });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const firebaseUID = session.metadata?.firebaseUID;
          
          console.log(`Processing checkout.session.completed for session ${session.id}, Firebase UID: ${firebaseUID}`);
          
          if (!firebaseUID) {
            console.error("No Firebase UID in session metadata");
            break;
          }

          // Get subscription details
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            console.log(`Updating subscription for user ${firebaseUID}: ${subscription.id} (${subscription.status})`);
            
            await storage.updateUserSubscription(firebaseUID, {
              subscriptionId: subscription.id,
              status: subscription.status,
              periodEnd: new Date((subscription as any).current_period_end * 1000),
            });
            
            console.log(`Successfully updated subscription for user ${firebaseUID}`);
          } else {
            // Handle one-time payment
            console.log(`One-time payment completed for user ${firebaseUID}`);
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`Processing invoice.paid: ${invoice.id}`);
          
          if ((invoice as any).subscription) {
            const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            
            if ('metadata' in customer && customer.metadata?.firebaseUID) {
              console.log(`Updating subscription from invoice.paid for user ${customer.metadata.firebaseUID}`);
              
              await storage.updateUserSubscription(customer.metadata.firebaseUID, {
                subscriptionId: subscription.id,
                status: subscription.status,
                periodEnd: new Date((subscription as any).current_period_end * 1000),
              });
              
              console.log(`Successfully updated subscription from invoice for user ${customer.metadata.firebaseUID}`);
            }
          }
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          console.log(`Processing customer.subscription.created: ${subscription.id}`);
          
          if ('metadata' in customer && customer.metadata?.firebaseUID) {
            console.log(`Creating subscription for user ${customer.metadata.firebaseUID}`);
            
            await storage.updateUserSubscription(customer.metadata.firebaseUID, {
              subscriptionId: subscription.id,
              status: subscription.status,
              periodEnd: new Date((subscription as any).current_period_end * 1000),
            });
            
            console.log(`Successfully created subscription for user ${customer.metadata.firebaseUID}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          console.log(`Processing customer.subscription.updated: ${subscription.id} (${subscription.status})`);
          
          if ('metadata' in customer && customer.metadata?.firebaseUID) {
            await storage.updateUserSubscription(customer.metadata.firebaseUID, {
              subscriptionId: subscription.id,
              status: subscription.status,
              periodEnd: new Date((subscription as any).current_period_end * 1000),
            });
            
            console.log(`Successfully updated subscription for user ${customer.metadata.firebaseUID}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          console.log(`Processing customer.subscription.deleted: ${subscription.id}`);
          
          if ('metadata' in customer && customer.metadata?.firebaseUID) {
            await storage.cancelUserSubscription(customer.metadata.firebaseUID);
            console.log(`Successfully cancelled subscription for user ${customer.metadata.firebaseUID}`);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ 
        received: true,
        eventType: event.type,
        eventId: event.id,
        processed: true
      });
    } catch (error) {
      console.error("❌ Webhook processing error:", error);
      console.error("Event type:", event?.type);
      console.error("Event ID:", event?.id);
      console.error("Event data:", JSON.stringify(event, null, 2));
      
      res.status(500).json({ 
        error: "processing_failed",
        message: "Webhook processing failed",
        eventType: event?.type,
        eventId: event?.id
      });
    }
  });

  // Manual subscription verification endpoint (fallback for webhook failures)
  app.put("/api/jobs/:id/flashcards", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const { flashcards } = req.body;
      
      if (!jobId || !flashcards) {
        return res.status(400).json({ error: "Job ID and flashcards are required" });
      }

      // Verify job ownership
      const [job] = await db.select()
        .from(flashcardJobs)
        .where(eq(flashcardJobs.id, jobId))
        .limit(1);

      if (!job || job.userId !== req.user!.uid) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Update flashcards
      await db.update(flashcardJobs)
        .set({
          flashcards: JSON.stringify(flashcards),
          updatedAt: new Date()
        })
        .where(eq(flashcardJobs.id, jobId));

      res.json({ success: true, message: "Flashcards updated successfully" });
    } catch (error) {
      console.error("Error updating flashcards:", error);
      res.status(500).json({ error: "Failed to update flashcards" });
    }
  });

  app.post("/api/verify-subscription", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.metadata?.firebaseUID !== userId) {
        return res.status(403).json({ message: "Session does not belong to this user" });
      }

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // Get subscription details and update user
      if (session.subscription) {
        console.log(`Processing subscription verification for user ${userId}`);
        
        // Simple premium upgrade without complex subscription tracking
        await storage.upgradeToPremium(userId);
        
        console.log(`Manual subscription verification successful for user ${userId}`);
        
        const updatedUser = await storage.getUser(userId);
        res.json({ 
          message: "Subscription verified and activated", 
          isPremium: true,
          user: updatedUser 
        });
      } else {
        res.status(400).json({ message: "No subscription found for this session" });
      }
    } catch (error) {
      console.error("Manual subscription verification error:", error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });

  // Legacy upgrade endpoint (for testing)
  app.post("/api/user/upgrade", verifyFirebaseToken as any, async (req: any, res) => {
    try {
      const userId = req.user!.uid;
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
  pdfBuffer: Buffer,
  originalFilename: string,
  apiProvider: string,
  subject: string,
  focusAreas: string,
  difficulty: string,
  userId: string,
  flashcardCount: string,
  customContext?: string
) {
  let tempPdfPath: string | null = null;
  
  try {
    // Update job status
    await storage.updateFlashcardJob(jobId, {
      status: "processing",
      progress: 10,
      currentTask: "Extracting text from PDF...",
    });

    // Create temporary file for OCR processing
    tempPdfPath = path.join("/tmp", `temp_${jobId}_${Date.now()}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Extract text from PDF with OCR support
    const ocrResult = await extractTextWithOCR(tempPdfPath);
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

      // Map tier to actual provider and get API key
      const actualProvider = apiProvider === "openai" ? "openai" : "anthropic";
      const systemApiKey = actualProvider === "openai" 
        ? process.env.OPENAI_API_KEY 
        : process.env.ANTHROPIC_API_KEY;
      
      if (!systemApiKey) {
        throw new Error(`${actualProvider.toUpperCase()} API key not configured`);
      }

      flashcards = await generateFlashcards(
        preprocessResult.filteredContent,
        actualProvider,
        systemApiKey,
        parseInt(flashcardCount),
        subject,
        JSON.parse(focusAreas || "{}"),
        difficulty,
        customContext
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

    // Get job info for filename
    const currentJob = await storage.getFlashcardJob(jobId);
    if (!currentJob) throw new Error("Job not found");

    // Store files in Object Storage
    const storedPdf = await objectStorage.uploadPDF(userId, jobId, tempPdfPath, originalFilename);
    const storedAnki = await objectStorage.uploadAnkiDeck(userId, jobId, ankiDeckPath);
    const exportFiles = await objectStorage.generateAndUploadExports(userId, jobId, flashcards);

    // Complete the job
    await storage.updateFlashcardJob(jobId, {
      status: "completed",
      progress: 100,
      currentTask: "All files ready for download",
      pdfStorageKey: storedPdf.key,
      pdfDownloadUrl: storedPdf.url,
      ankiStorageKey: storedAnki.key,
      ankiDownloadUrl: storedAnki.url,
      csvStorageKey: exportFiles.csv?.key,
      csvDownloadUrl: exportFiles.csv?.url,
      jsonStorageKey: exportFiles.json?.key,
      jsonDownloadUrl: exportFiles.json?.url,
      quizletStorageKey: exportFiles.quizlet?.key,
      quizletDownloadUrl: exportFiles.quizlet?.url,
    });

    // Clean up temporary files
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
    }
    if (fs.existsSync(ankiDeckPath)) {
      fs.unlinkSync(ankiDeckPath);
    }
  } catch (error) {
    console.error("Processing error:", error);
    await storage.updateFlashcardJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
    });
    
    // Clean up temporary files
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      fs.unlinkSync(tempPdfPath);
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
    const outputPath = path.join("/tmp", `deck_${jobId}_${Date.now()}.apkg`);
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

// Helper function to calculate next review date based on difficulty
function calculateNextReviewDate(status: string, difficultyRating?: string): Date {
  const now = new Date();
  const nextDate = new Date(now);

  if (status === 'known') {
    // Known cards: longer intervals
    switch (difficultyRating) {
      case 'easy':
        nextDate.setDate(now.getDate() + 7); // 1 week
        break;
      case 'medium':
        nextDate.setDate(now.getDate() + 3); // 3 days
        break;
      case 'hard':
        nextDate.setDate(now.getDate() + 1); // 1 day
        break;
      default:
        nextDate.setDate(now.getDate() + 3); // Default to 3 days
    }
  } else if (status === 'reviewing') {
    // Reviewing cards: shorter intervals
    switch (difficultyRating) {
      case 'easy':
        nextDate.setDate(now.getDate() + 2); // 2 days
        break;
      case 'medium':
        nextDate.setDate(now.getDate() + 1); // 1 day
        break;
      case 'hard':
        nextDate.setHours(now.getHours() + 4); // 4 hours
        break;
      default:
        nextDate.setDate(now.getDate() + 1); // Default to 1 day
    }
  } else {
    // Unknown cards: immediate review
    nextDate.setHours(now.getHours() + 1); // 1 hour
  }

  return nextDate;
}

// Helper function to process regenerated flashcard jobs
async function processRegeneratedFlashcardJob(jobId: number, pdfStorageKey: string, customContext?: string) {
  try {
    // Update job status to processing
    await storage.updateFlashcardJob(jobId, {
      status: "processing",
      progress: 10,
      currentTask: "Retrieving original document..."
    });

    // Download the original PDF from storage
    const tempDir = path.join(__dirname, "../cache");
    const tempPdfPath = path.join(tempDir, `regenerate_${jobId}.pdf`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download PDF from object storage
    const pdfStream = await objectStorage.downloadFileStream(pdfStorageKey);
    const writeStream = fs.createWriteStream(tempPdfPath);
    
    await new Promise((resolve, reject) => {
      pdfStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Extract text from PDF
    await storage.updateFlashcardJob(jobId, {
      progress: 30,
      currentTask: "Extracting text from document..."
    });

    const extractedText = await extractTextFromPDF(tempPdfPath);
    
    if (!extractedText.trim()) {
      throw new Error("No text could be extracted from the PDF");
    }

    // Get job details for regeneration
    const job = await storage.getFlashcardJob(jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    // Parse focus areas and add custom context
    let focusAreas: any = {};
    try {
      if (job.focusAreas) {
        focusAreas = JSON.parse(job.focusAreas);
      }
    } catch (e) {
      console.warn("Could not parse focus areas, using defaults");
    }

    // Generate flashcards with custom context
    await storage.updateFlashcardJob(jobId, {
      progress: 50,
      currentTask: "Regenerating flashcards with new context..."
    });

    // Determine the correct API key for the provider
    const apiProvider = job.apiProvider as "openai" | "anthropic";
    const apiKey = apiProvider === "openai" 
      ? process.env.OPENAI_API_KEY! 
      : process.env.ANTHROPIC_API_KEY!;

    const flashcards = await generateFlashcards(
      extractedText,
      apiProvider,
      apiKey,
      job.flashcardCount,
      job.subject || "General",
      focusAreas,
      (job.difficulty as "beginner" | "intermediate" | "advanced") || "intermediate",
      customContext
    );

    // Generate and store exports
    await storage.updateFlashcardJob(jobId, {
      progress: 80,
      currentTask: "Generating export formats..."
    });

    const exportResults = await objectStorage.generateAndUploadExports(job.userId!, jobId, flashcards);

    // Generate Anki deck
    const ankiDeckPath = await generateAnkiDeck(jobId, flashcards);
    const ankiResult = ankiDeckPath ? await objectStorage.uploadAnkiDeck(job.userId!, jobId, ankiDeckPath) : null;

    // Update job with results
    await storage.updateFlashcardJob(jobId, {
      status: "completed",
      progress: 100,
      currentTask: "Regeneration completed!",
      flashcards: JSON.stringify(flashcards),
      ankiStorageKey: ankiResult?.key,
      ankiDownloadUrl: ankiResult?.url,
      csvStorageKey: exportResults.csv?.key,
      csvDownloadUrl: exportResults.csv?.url,
      jsonStorageKey: exportResults.json?.key,
      jsonDownloadUrl: exportResults.json?.url,
      quizletStorageKey: exportResults.quizlet?.key,
      quizletDownloadUrl: exportResults.quizlet?.url,
      processingTime: Math.floor((Date.now() - new Date(job.createdAt!).getTime()) / 1000)
    });

    // Clean up temporary files
    try {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
      if (ankiDeckPath && fs.existsSync(ankiDeckPath)) {
        fs.unlinkSync(ankiDeckPath);
      }
    } catch (cleanupError) {
      console.warn("Failed to clean up temporary files:", cleanupError);
    }

  } catch (error) {
    console.error("Error processing regenerated flashcard job:", error);
    await storage.updateFlashcardJob(jobId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error occurred during regeneration"
    });
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}