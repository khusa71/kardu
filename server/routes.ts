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
import { supabaseStorage } from "./supabase-storage-service";
import { verifySupabaseToken, requireEmailVerification, AuthenticatedRequest } from "./supabase-auth";
import { requireApiKeys, getAvailableProvider, validateApiKeys, logApiKeyStatus } from "./api-key-validator";
import { healthMonitor } from "./health-monitor";

import { getPageCount } from "./page-count-service";
import { canUserUpload, incrementUploadCount, getQuotaStatus } from "./usage-quota-service";

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
import { insertFlashcardJobSchema, userProfiles, flashcardJobs } from "@shared/schema";
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
      cb(new Error(`Only PDF files are allowed. You uploaded: ${file.mimetype}`));
    }
  },
});

// Initialize Stripe (optional for development)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.log('⚠️ Stripe not initialized - payment features will be disabled');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Raw body middleware for Stripe webhooks
  app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
  
  // JSON middleware for all other routes
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));


  // Supabase Auth routes
  app.post('/api/auth/sync', verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      // Extract user data from request (could be in req.body.user or directly in req.body)
      const userData = req.body.user || req.body;
      const userId = userData?.id || req.user?.id;
      const userEmail = userData?.email || req.user?.email;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Try to get existing user first
      let existingUser;
      try {
        existingUser = await storage.getUserProfile(userId);
      } catch (getUserError: any) {
        console.error('Error getting existing user:', getUserError?.message);
      }
      
      if (existingUser) {
        return res.json(existingUser);
      }

      // Create new user profile with all required fields
      const profileDataToInsert = {
        id: userId,
        email: userEmail,
        isEmailVerified: true, // Google OAuth users have verified emails
        isPremium: false,
        role: 'user',
        monthlyUploads: 0,
        monthlyLimit: 3,
        monthlyPagesProcessed: 0,
        lastResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const profileData = await storage.upsertUserProfile(profileDataToInsert);
      res.json(profileData);
    } catch (error: any) {
      console.error("Auth sync error:", error?.message || error);
      res.status(500).json({ error: "Database error saving new user" });
    }
  });

  // Development-only endpoint (disabled in production)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/auth/simple-login', async (req, res) => {
      try {
        const testUserId = 'c06363c1-507b-40d3-acaf-2baffb315b42';
        
        let userProfile = await storage.getUserProfile(testUserId);
        if (!userProfile) {
          userProfile = await storage.upsertUserProfile({
            id: testUserId,
            email: 'test@kardu.io',
            isPremium: false,
            role: 'user',
            monthlyUploads: 0,
            monthlyLimit: 3,
            monthlyPagesProcessed: 0,
            lastResetDate: new Date(),
            isEmailVerified: true,
            updatedAt: new Date()
          });
        }
        
        res.json({ 
          success: true, 
          user: userProfile,
          message: 'Development session created'
        });
      } catch (error) {
        console.error('Development login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });
  }

  // Development-only auth test endpoint
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/auth/test', async (req, res) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.json({ 
          authenticated: false, 
          error: 'No authorization header'
        });
      }
      
      res.json({ 
        authenticated: true, 
        tokenPresent: true
      });
    });
  }

  app.get('/api/auth/user', verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      let userProfile = await storage.getUserProfile(userId);
      
      // Create profile if it doesn't exist (first login)
      if (!userProfile) {
        userProfile = await storage.upsertUserProfile({
          id: userId,
          isPremium: false,
          role: 'user',
          monthlyUploads: 0,
          monthlyLimit: 3,
          monthlyPagesProcessed: 0,
          lastResetDate: new Date(),
        });
      }

      // Check current monthly usage and reset if needed
      const { uploadsRemaining } = await storage.checkUploadLimit(userId);
      const updatedUser = await storage.getUserProfile(userId); // Get fresh data after potential reset
      
      // Calculate correct monthly usage data
      const currentUploads = updatedUser?.monthlyUploads || 0;
      const monthlyLimit = updatedUser?.monthlyLimit || (updatedUser?.isPremium ? 100 : 3);
      
      // Determine if user is OAuth-verified (Google) or email-verified
      const isOAuthUser = req.user!.app_metadata?.providers?.includes('google') || 
                         req.user!.user_metadata?.iss === 'https://accounts.google.com';
      const isEmailVerified = isOAuthUser || !!req.user!.email_confirmed_at;

      const userWithUsage = {
        id: updatedUser?.id,
        email: req.user!.email,
        displayName: req.user!.user_metadata?.name || req.user!.email?.split('@')[0],
        photoURL: req.user!.user_metadata?.avatar_url,
        provider: isOAuthUser ? 'google' : 'email',
        isEmailVerified,
        isPremium: updatedUser?.isPremium || false,
        role: updatedUser?.role || 'user',
        monthlyUploads: currentUploads,
        monthlyLimit,
        uploadsRemaining,
        stripeCustomerId: updatedUser?.stripeCustomerId,
        subscriptionStatus: updatedUser?.subscriptionStatus,
      };
      
      res.json(userWithUsage);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Enhanced upload validation middleware with page-based limits
  const validateFileUploads = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user!.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUserProfile(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check email verification (skip for OAuth users as they're pre-verified)
      const isOAuthUser = req.user!.app_metadata?.providers?.includes('google') || 
                         req.user!.user_metadata?.iss === 'https://accounts.google.com';
      
      if (!isOAuthUser && !req.user!.email_confirmed_at) {
        return res.status(403).json({ 
          message: "Please verify your email to continue",
          requiresEmailVerification: true 
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

      // Page-based validation for each file
      const tempDir = "/tmp";
      let totalPagesWillProcess = 0;
      const fileValidations = [];

      for (const file of files) {
        // Save file temporarily to check page count
        const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${file.originalname}`);
        fs.writeFileSync(tempFilePath, file.buffer);

        try {
          // Get page count
          const pageInfo = await getPageCount(tempFilePath);
          
          // Check if user can upload this file
          const uploadCheck = await canUserUpload(userId, pageInfo.pageCount);
          
          if (!uploadCheck.canUpload) {
            // Clean up temp file
            fs.unlinkSync(tempFilePath);
            return res.status(429).json({
              message: uploadCheck.reason,
              fileName: file.originalname,
              pageCount: pageInfo.pageCount,
              quotaInfo: uploadCheck.quotaInfo,
              limits: uploadCheck.limits,
              requiresUpgrade: !user.isPremium
            });
          }

          totalPagesWillProcess += uploadCheck.pagesWillProcess || 0;
          fileValidations.push({
            file,
            tempFilePath,
            pageInfo,
            pagesWillProcess: uploadCheck.pagesWillProcess
          });

        } catch (error) {
          // Clean up temp file on error
          fs.unlinkSync(tempFilePath);
          return res.status(400).json({
            message: `Failed to analyze PDF: ${file.originalname}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Store validation info for use in upload handler
      req.fileValidations = fileValidations;
      req.totalPagesWillProcess = totalPagesWillProcess;
      req.userType = user.isPremium ? "premium" : "free";
      
      next();
    } catch (error) {
      console.error("File upload validation error:", error);
      res.status(500).json({ message: "Failed to validate file uploads" });
    }
  };

  // Upload PDF(s) and start processing (with auth, rate limiting, and API key validation)
  app.post("/api/upload", verifySupabaseToken as any, requireApiKeys, (req, res, next) => {
    upload.array("pdfs", 10)(req, res, (err) => {
      if (err) {
        console.log('DEBUG: Upload error:', err.message, err.code);
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message.includes('Only PDF files are allowed')) {
          return res.status(400).json({ 
            message: "Only PDF files are allowed. Please upload PDF documents only.",
            error: "INVALID_FILE_TYPE"
          });
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  }, validateFileUploads as any, async (req: any, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No PDF files uploaded" });
      }

      const userId = req.user!.id;
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
      const user = await storage.getUserProfile(userId);
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

      // Process files using page-based validation results with transaction safety
      const createdJobs = [];
      const fileValidations = req.fileValidations;
      
      // Validate input data integrity
      if (!fileValidations || fileValidations.length === 0) {
        return res.status(400).json({ message: "No valid files to process" });
      }
      
      try {
        // Process each file with proper error handling
        for (let i = 0; i < fileValidations.length; i++) {
          const validation = fileValidations[i];
          const file = validation.file;
          
          // Validate file data integrity
          if (!file || !validation.pageInfo) {
            throw new Error(`Invalid file validation data for file ${i + 1}`);
          }
          
          const jobData = {
            userId,
            filename: file.originalname,
            fileSize: file.size,
            pageCount: validation.pageInfo.pageCount,
            pagesProcessed: validation.pagesWillProcess,
            apiProvider: enforcedProvider,
            flashcardCount: parseInt(flashcardCount),
            subject: subject || "general",
            difficulty: difficulty || "intermediate",
            focusAreas: JSON.stringify(focusAreas || {}),
            status: "pending" as const,
            progress: 0,
            currentTask: validation.pagesWillProcess < validation.pageInfo.pageCount 
              ? `Processing first ${validation.pagesWillProcess} of ${validation.pageInfo.pageCount} pages...`
              : enforcedProvider !== selectedProvider 
                ? `Starting processing with ${selectedProvider} (fallback from ${enforcedProvider})...`
                : "Starting processing...",
          };

          // Create job record with error handling
          const job = await storage.createFlashcardJob(jobData);
          createdJobs.push(job);

          // Start processing asynchronously with proper error isolation
          setImmediate(() => {
            processFlashcardJobWithPageLimits(
              job.id, 
              validation.tempFilePath, 
              file.originalname, 
              selectedProvider, 
              subject, 
              focusAreas, 
              difficulty, 
              userId, 
              flashcardCount, 
              customContext,
              validation.pagesWillProcess || validation.pageInfo.pageCount
            ).catch(error => {
              console.error(`Async processing failed for job ${job.id}:`, error);
              // Update job status to failed
              storage.updateFlashcardJob(job.id, {
                status: "failed",
                errorMessage: error.message,
                currentTask: "Processing failed"
              }).catch(updateError => {
                console.error(`Failed to update job ${job.id} status:`, updateError);
              });
            });
          });
        }

        // Atomic increment of user quotas
        await incrementUploadCount(userId, req.totalPagesWillProcess);
        
      } catch (error) {
        // Clean up any created jobs on failure
        for (const job of createdJobs) {
          try {
            await storage.deleteFlashcardJob(job.id);
          } catch (cleanupError) {
            console.error(`Failed to cleanup job ${job.id}:`, cleanupError);
          }
        }
        throw error;
      }

      res.json({ 
        jobs: createdJobs.map(job => ({
          jobId: job.id,
          filename: job.filename,
          status: job.status,
          pageCount: job.pageCount,
          pagesProcessed: job.pagesProcessed
        })),
        totalFiles: files.length,
        totalPagesProcessed: req.totalPagesWillProcess,
        userType: req.userType
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Get job status
  app.get("/api/jobs/:id", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Verify job ownership
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(job);
    } catch (error) {
      console.error("Job status error:", error);
      res.status(500).json({ message: "Failed to get job status" });
    }
  });

  // Restart job endpoint
  app.post("/api/jobs/:id/restart", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const job = await storage.getFlashcardJob(jobId);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job not found or access denied" });
      }

      // Reset job to pending status
      await storage.updateFlashcardJob(jobId, {
        status: "pending",
        progress: 0,
        currentTask: "Restarting processing...",
        errorMessage: null,
        updatedAt: new Date()
      });

      // Start processing in background
      processFlashcardJob(jobId);

      res.json({ message: "Job restart initiated", jobId });
    } catch (error) {
      console.error("Job restart error:", error);
      res.status(500).json({ message: "Failed to restart job" });
    }
  });

  // Test endpoint for direct job processing
  app.post("/api/test-process-job", async (req, res) => {
    try {
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ error: "Job ID required" });
      }
      
      // Start processing in background
      processFlashcardJob(jobId);
      
      res.json({ message: "Job processing started", jobId });
    } catch (error) {
      console.error("Test processing error:", error);
      res.status(500).json({ error: "Failed to start processing" });
    }
  });

  // Test endpoint for JSON parsing validation
  app.post("/api/test-json-parser", async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content required" });
      }
      
      // Use the same parsing logic from ai-service.ts
      let jsonContent = content.trim();
      
      // Method 1: Extract from markdown code blocks
      const markdownMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (markdownMatch) {
        jsonContent = markdownMatch[1].trim();
      }
      
      // Method 2: Clean up any remaining markdown artifacts
      jsonContent = jsonContent
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^```\s*/i, '')
        .trim();
      
      // Method 3: Handle cases where JSON is embedded in text
      const embeddedJsonMatch = jsonContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (embeddedJsonMatch && !jsonContent.startsWith('[') && !jsonContent.startsWith('{')) {
        jsonContent = embeddedJsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonContent);
      const flashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
      
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        return res.status(400).json({ error: "No valid flashcards found in content" });
      }
      
      res.json({ 
        success: true, 
        flashcards,
        originalLength: content.length,
        parsedLength: jsonContent.length
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: "JSON parsing failed",
        message: error.message,
        content: req.body.content?.substring(0, 200) + "..."
      });
    }
  });

// Background processing function for flashcard jobs
async function processFlashcardJob(jobId: number) {
  try {
    const job = await storage.getFlashcardJob(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    await storage.updateFlashcardJob(jobId, {
      status: "processing",
      progress: 10,
      currentTask: "Loading document...",
      updatedAt: new Date()
    });

    // Extract text from stored PDF
    let extractedText = "";
    if (job.pdfStorageKey) {
      const pdfBuffer = await supabaseStorage.downloadFile(job.pdfStorageKey);
      
      // Save to temp file for processing
      const tempFilePath = path.join("/tmp", `job_${jobId}_${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, pdfBuffer);

      await storage.updateFlashcardJob(jobId, {
        progress: 30,
        currentTask: "Extracting text from document...",
        updatedAt: new Date()
      });

      // Extract text using Python processor with proper resource management
      const result = await new Promise<{ text: string }>((resolve, reject) => {
        const pythonProcess = spawn('python', [
          path.join(__dirname, 'pdf-processor.py'),
          tempFilePath,
          (job.pagesProcessed || 20).toString()
        ]);

        let output = '';
        let errorOutput = '';
        let isResolved = false;

        // Set timeout to prevent hanging processes
        const timeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            pythonProcess.kill('SIGTERM');
            // Force cleanup temp file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (e) {
              console.warn('Failed to cleanup temp file on timeout:', e);
            }
            reject(new Error('Text extraction timed out'));
          }
        }, 180000); // 3 minutes timeout

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);

          // Always clean up temp file
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.warn('Failed to cleanup temp file:', e);
          }

          if (code !== 0) {
            console.error('Python script error:', errorOutput);
            reject(new Error(`Text extraction failed: ${errorOutput}`));
          } else {
            try {
              const result = JSON.parse(output);
              if (!result || !result.text) {
                reject(new Error('Invalid extraction result format'));
              } else {
                resolve(result);
              }
            } catch (parseError) {
              reject(new Error('Failed to parse extraction result'));
            }
          }
        });

        pythonProcess.on('error', (error) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          
          // Cleanup on process error
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.warn('Failed to cleanup temp file on process error:', e);
          }
          
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });
      });

      extractedText = result.text;
    }

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("Insufficient text content extracted from document");
    }

    await storage.updateFlashcardJob(jobId, {
      progress: 50,
      currentTask: "Generating flashcards with AI...",
      updatedAt: new Date()
    });

    // Parse focus areas
    let focusAreas = {};
    try {
      focusAreas = JSON.parse(job.focusAreas || "{}");
    } catch (e) {
      focusAreas = { concepts: true, definitions: true };
    }

    // Generate flashcards using AI service
    const model = job.apiProvider === "openai" ? "openai/gpt-4o" : "anthropic/claude-3.5-sonnet";
    const apiKey = process.env.OPENROUTER_API_KEY!;
    
    const flashcards = await generateFlashcards(
      extractedText,
      model,
      apiKey,
      job.flashcardCount,
      job.subject || "general",
      focusAreas,
      job.difficulty || "intermediate",
      undefined // customContext
    );

    await storage.updateFlashcardJob(jobId, {
      progress: 80,
      currentTask: "Generating export files...",
      updatedAt: new Date()
    });

    // Generate and store export files
    const exports = await supabaseStorage.generateAndUploadExports(
      job.userId!,
      jobId,
      flashcards
    );

    // Complete the job
    await storage.updateFlashcardJob(jobId, {
      status: "completed",
      progress: 100,
      currentTask: "Processing complete",
      flashcards: JSON.stringify(flashcards),
      csvStorageKey: exports.csv?.key,
      csvDownloadUrl: exports.csv?.url,
      jsonStorageKey: exports.json?.key,
      jsonDownloadUrl: exports.json?.url,
      quizletStorageKey: exports.quizlet?.key,
      quizletDownloadUrl: exports.quizlet?.url,
      processingTime: Math.floor((Date.now() - (job.updatedAt ? new Date(job.updatedAt).getTime() : Date.now())) / 1000),
      updatedAt: new Date()
    });



  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    
    await storage.updateFlashcardJob(jobId, {
      status: "failed",
      progress: 0,
      currentTask: "Processing failed",
      errorMessage: error.message || "Unknown error occurred",
      updatedAt: new Date()
    });
  }
}

  // Delete job and associated files
  app.delete("/api/jobs/:id", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
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
          const deleted = await supabaseStorage.deleteFile(fileKey as string);
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
      
      const fileBuffer = await supabaseStorage.downloadFile(job.ankiStorageKey);
      const stream = require('stream').Readable.from(fileBuffer);
      stream.pipe(res);
      
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Get user's upload history
  app.get("/api/history", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
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

  // Update job filename
  app.put("/api/jobs/:id/rename", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const jobId = parseInt(req.params.id);
      const { filename } = req.body;

      if (!filename || !filename.trim()) {
        return res.status(400).json({ message: "Filename is required" });
      }

      // Get the job to verify ownership
      const job = await storage.getFlashcardJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update the filename
      await storage.updateJobFilename(jobId, filename.trim());

      res.json({ message: "Filename updated successfully" });
    } catch (error) {
      console.error("Filename update error:", error);
      res.status(500).json({ message: "Failed to update filename" });
    }
  });

  // Get user's flashcard decks for study page
  app.get("/api/decks", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
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
  app.get("/api/download/pdf/:id", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Validate job ID
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }

      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "File not found" });
      }

      if (!job.pdfStorageKey) {
        return res.status(404).json({ message: "Original file no longer available" });
      }

      // Download file with comprehensive error handling
      try {
        const pdfBuffer = await supabaseStorage.downloadFile(job.pdfStorageKey);
        
        // Validate buffer
        if (!pdfBuffer || pdfBuffer.length === 0) {
          return res.status(404).json({ message: "File is empty or corrupted" });
        }

        // Set response headers
        res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length.toString());
        
        // Send file
        res.send(pdfBuffer);
      } catch (downloadError) {
        console.error("File download failed:", downloadError);
        
        // Handle specific storage errors
        if (downloadError instanceof Error) {
          if (downloadError.message.includes('not found') || downloadError.message.includes('does not exist')) {
            return res.status(404).json({ message: "File not found in storage" });
          }
          if (downloadError.message.includes('access denied') || downloadError.message.includes('unauthorized')) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        
        return res.status(500).json({ message: "Download failed" });
      }
    } catch (error) {
      console.error("PDF download endpoint error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Health endpoint for monitoring
  app.get("/api/health", async (_req: express.Request, res: express.Response) => {
    try {
      const health = await healthMonitor.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: Date.now(),
        error: 'Health check failed' 
      });
    }
  });

  // Security status endpoint
  app.get("/api/security-status", async (_req: express.Request, res: express.Response) => {
    try {
      const securityStatus = {
        status: 'active',
        headers: ['helmet', 'cors', 'rate-limiting'],
        timestamp: new Date().toISOString()
      };
      res.json(securityStatus);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get security status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Security reports endpoint for CSP violation reports
  app.post("/api/reports", express.json(), async (req: express.Request, res: express.Response) => {
    try {
      const report = req.body;
      console.log('Security Report:', JSON.stringify(report, null, 2));
      
      // In production, you might want to store these reports in a database
      // or send them to a monitoring service
      
      res.status(204).send(); // No content response for reports
    } catch (error) {
      console.error('Error processing security report:', error);
      res.status(500).json({ error: 'Failed to process report' });
    }
  });

  // Note: Object storage downloads now use direct Supabase Storage URLs
  // No separate download endpoint needed

  // Export flashcards in multiple formats (redirects to Object Storage)
  app.get("/api/export/:id/:format", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const format = req.params.format as 'csv' | 'json' | 'quizlet';
      const userId = req.user!.id;
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

      try {
        const fileBuffer = await supabaseStorage.downloadFile(storageKey);
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);
        
        res.send(fileBuffer);
      } catch (downloadError) {
        console.error("File download error:", downloadError);
        return res.status(404).json({ message: "Export file not found" });
      }
      
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Regenerate flashcards with custom context
  app.post("/api/regenerate/:id", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { customContext, flashcardCount, difficulty, focusAreas } = req.body;

      // Validate input
      if (!customContext || typeof customContext !== 'string' || customContext.trim().length === 0) {
        return res.status(400).json({ message: "Custom context is required for regeneration" });
      }

      // Get original job
      const originalJob = await storage.getFlashcardJob(jobId);
      if (!originalJob || originalJob.userId !== userId) {
        return res.status(404).json({ message: "Original job not found" });
      }

      if (originalJob.status !== "completed") {
        return res.status(400).json({ message: "Original job must be completed before regeneration" });
      }

      // Create new job for regeneration
      const newJobData = {
        userId,
        filename: `${originalJob.filename} (Regenerated)`,
        fileSize: originalJob.fileSize,
        pageCount: originalJob.pageCount,
        pagesProcessed: originalJob.pagesProcessed,
        apiProvider: originalJob.apiProvider,
        flashcardCount: flashcardCount || originalJob.flashcardCount,
        subject: originalJob.subject,
        difficulty: difficulty || originalJob.difficulty,
        focusAreas: JSON.stringify(focusAreas || JSON.parse(originalJob.focusAreas || "{}")),
        status: "pending" as const,
        progress: 0,
        currentTask: "Starting regeneration with custom context...",
        regeneratedFromJobId: originalJob.id
      };

      const newJob = await storage.createFlashcardJob(newJobData);

      // Start regeneration process asynchronously
      regenerateFlashcardsProcess(
        newJob.id,
        originalJob.id,
        customContext,
        originalJob.subject || "General",
        difficulty || originalJob.difficulty || "intermediate",
        focusAreas || JSON.parse(originalJob.focusAreas || "{}"),
        flashcardCount || originalJob.flashcardCount,
        userId
      );

      res.json({ 
        message: "Regeneration started",
        jobId: newJob.id,
        originalJobId: originalJob.id
      });

    } catch (error) {
      console.error("Regeneration error:", error);
      res.status(500).json({ message: "Failed to start regeneration" });
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
  app.get("/api/user/jobs", verifySupabaseToken as any, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const jobs = await storage.getUserJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("User jobs error:", error);
      res.status(500).json({ message: "Failed to get user jobs" });
    }
  });

  // Get user quota status for dashboard
  app.get("/api/quota-status", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const quotaStatus = await getQuotaStatus(userId);
      res.json(quotaStatus);
    } catch (error) {
      console.error("Quota status error:", error);
      res.status(500).json({ message: "Failed to fetch quota status" });
    }
  });

  // Stripe checkout session creation
  app.post("/api/create-checkout-session", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    if (!stripe) {
      return res.status(503).json({ message: "Payment service unavailable" });
    }
    
    try {
      const userId = req.user!.id;
      const user = await storage.getUserProfile(userId);
      
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
          ...(user.email && { email: user.email }),
          metadata: {
            supabaseUID: userId,
          },
        });
        customerId = customer.id;
        await storage.updateStripeCustomerId(userId, customerId);
      }

      // Create checkout session
      const session = await stripe!.checkout.sessions.create({
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
          supabaseUID: userId,
        },
      });

      console.log(`Created checkout session ${session.id} for user ${userId} with customer ${customerId}`);

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout session error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Optimized study data loading endpoint
  app.get("/api/study-data/:jobId", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user!.id;

      // Get optimized flashcards with progress data in a single efficient call
      const studyData = await storage.getOptimizedFlashcards(jobId, userId);
      const stats = await storage.getStudyStats(userId, jobId);

      res.json({ 
        flashcards: studyData.flashcards,
        progress: studyData.progress,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching optimized study data:", error);
      res.status(500).json({ error: "Failed to fetch study data" });
    }
  });

  // Legacy endpoint for backward compatibility
  app.get("/api/study-progress/:jobId", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user!.id;

      const progress = await storage.getStudyProgress(userId, jobId);
      const stats = await storage.getStudyStats(userId, jobId);

      res.json({ progress, stats });
    } catch (error) {
      console.error("Error fetching study progress:", error);
      res.status(500).json({ error: "Failed to fetch study progress" });
    }
  });

  app.post("/api/study-progress", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { jobId, cardIndex, status, difficultyRating } = req.body;
      const userId = req.user!.id;

      const progressData = {
        userId,
        jobId,
        cardIndex,
        status,
        difficultyRating,
        lastReviewedAt: new Date(),
        nextReviewDate: calculateNextReviewDate(status, difficultyRating, 0)
      };

      const updatedProgress = await storage.upsertStudyProgress(progressData);
      res.json(updatedProgress);
    } catch (error) {
      console.error("Error updating study progress:", error);
      res.status(500).json({ error: "Failed to update study progress" });
    }
  });

  // Batch study progress update endpoint for session optimization
  app.post("/api/study-progress/batch", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { jobId, progressUpdates } = req.body;
      const userId = req.user!.id;

      // Validate input
      if (!Array.isArray(progressUpdates) || progressUpdates.length === 0) {
        return res.status(400).json({ error: "Progress updates array is required" });
      }

      if (progressUpdates.length > 100) {
        return res.status(400).json({ error: "Too many updates in single batch (max 100)" });
      }

      // Prepare batch data with calculated review dates
      const batchData = progressUpdates.map((update: any) => ({
        userId,
        jobId: parseInt(jobId),
        cardIndex: update.cardIndex,
        status: update.status,
        difficultyRating: update.difficultyRating,
        lastReviewedAt: new Date(),
        nextReviewDate: calculateNextReviewDate(update.status, update.difficultyRating, update.reviewCount || 0)
      }));

      // Execute batch update
      const results = await storage.batchUpdateStudyProgress(batchData);
      
      res.json({ 
        success: true, 
        updatedCount: results.length,
        results: results.slice(0, 5) // Return first 5 for verification
      });
    } catch (error) {
      console.error("Error batch updating study progress:", error);
      res.status(500).json({ error: "Failed to batch update study progress" });
    }
  });

  // Update flashcards endpoint
  app.put("/api/jobs/:id/flashcards", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
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
  app.post("/api/regenerate/:jobId", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user!.id;
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
  app.get("/api/admin/metrics", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUserProfile(userId);
      
      // Check if user has admin role
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
      }

      // Get all users count
      const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(userProfiles);
      const totalUsers = totalUsersResult[0]?.count || 0;

      // Get total jobs count
      const totalJobsResult = await db.select({ count: sql<number>`count(*)` }).from(flashcardJobs);
      const totalJobs = totalJobsResult[0]?.count || 0;

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsersResult = await db.select({ count: sql<number>`count(*)` })
        .from(userProfiles)
        .where(sql`${userProfiles.createdAt} >= ${thirtyDaysAgo}`);
      
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
      event = stripe!.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
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
          const supabaseUID = session.metadata?.supabaseUID;
          
          console.log(`Processing checkout.session.completed for session ${session.id}, Firebase UID: ${supabaseUID}`);
          
          if (!supabaseUID) {
            console.error("No Firebase UID in session metadata");
            break;
          }

          // Get subscription details
          if (session.subscription) {
            const subscription = await stripe!.subscriptions.retrieve(session.subscription as string);
            console.log(`Updating subscription for user ${supabaseUID}: ${subscription.id} (${subscription.status})`);
            
            await storage.updateUserSubscription(supabaseUID, {
              subscriptionId: subscription.id,
              status: subscription.status,
              periodEnd: new Date((subscription as any).current_period_end * 1000),
            });
            
            console.log(`Successfully updated subscription for user ${supabaseUID}`);
          } else {
            // Handle one-time payment
            console.log(`One-time payment completed for user ${supabaseUID}`);
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`Processing invoice.paid: ${invoice.id}`);
          
          if ((invoice as any).subscription) {
            const subscription = await stripe!.subscriptions.retrieve((invoice as any).subscription as string);
            const customer = await stripe!.customers.retrieve(subscription.customer as string);
            
            if ('metadata' in customer && customer.metadata?.supabaseUID) {
              console.log(`Updating subscription from invoice.paid for user ${customer.metadata.supabaseUID}`);
              
              await storage.updateUserSubscription(customer.metadata.supabaseUID, {
                subscriptionId: subscription.id,
                status: subscription.status,
                periodEnd: new Date((subscription as any).current_period_end * 1000),
              });
              
              console.log(`Successfully updated subscription from invoice for user ${customer.metadata.supabaseUID}`);
            }
          }
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe!.customers.retrieve(subscription.customer as string);
          
          console.log(`Processing customer.subscription.created: ${subscription.id}`);
          
          if ('metadata' in customer && customer.metadata?.supabaseUID) {
            console.log(`Creating subscription for user ${customer.metadata.supabaseUID}`);
            
            await storage.updateUserSubscription(customer.metadata.supabaseUID, {
              subscriptionId: subscription.id,
              status: subscription.status,
              periodEnd: new Date((subscription as any).current_period_end * 1000),
            });
            
            console.log(`Successfully created subscription for user ${customer.metadata.supabaseUID}`);
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe!.customers.retrieve(subscription.customer as string);
          
          console.log(`Processing customer.subscription.updated: ${subscription.id} (${subscription.status})`);
          
          if ('metadata' in customer && customer.metadata?.supabaseUID) {
            await storage.updateUserSubscription(customer.metadata.supabaseUID, {
              subscriptionId: subscription.id,
              status: subscription.status,
              periodEnd: new Date((subscription as any).current_period_end * 1000),
            });
            
            console.log(`Successfully updated subscription for user ${customer.metadata.supabaseUID}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = await stripe!.customers.retrieve(subscription.customer as string);
          
          console.log(`Processing customer.subscription.deleted: ${subscription.id}`);
          
          if ('metadata' in customer && customer.metadata?.supabaseUID) {
            await storage.cancelUserSubscription(customer.metadata.supabaseUID);
            console.log(`Successfully cancelled subscription for user ${customer.metadata.supabaseUID}`);
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
  app.put("/api/jobs/:id/flashcards", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
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

      if (!job || job.userId !== req.user!.id) {
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

  app.post("/api/verify-subscription", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }

      // Retrieve the checkout session from Stripe
      const session = await stripe!.checkout.sessions.retrieve(sessionId);
      
      if (session.metadata?.supabaseUID !== userId) {
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
        
        const updatedUser = await storage.getUserProfile(userId);
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
  app.post("/api/user/upgrade", verifySupabaseToken as any, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      await storage.upgradeToPremium(userId);
      
      const updatedUser = await storage.getUserProfile(userId);
      res.json({ message: "Successfully upgraded to premium", user: updatedUser });
    } catch (error) {
      console.error("Upgrade error:", error);
      res.status(500).json({ message: "Failed to upgrade account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Page-limited background processing function
async function processFlashcardJobWithPageLimits(
  jobId: number,
  pdfPath: string,
  originalFilename: string,
  apiProvider: string,
  subject: string,
  focusAreas: string,
  difficulty: string,
  userId: string,
  flashcardCount: string,
  customContext?: string,
  maxPages?: number
) {
  try {
    // Get job and user info for premium restrictions
    const job = await storage.getFlashcardJob(jobId);
    const user = await storage.getUserProfile(userId);
    
    if (!job || !user) {
      throw new Error("Job or user not found");
    }

    // Enforce premium restrictions on page processing
    const actualPagesToProcess = maxPages || job.pageCount || 20;
    const premiumLimits = user.isPremium ? 100 : 20;
    const finalPagesToProcess = Math.min(actualPagesToProcess, premiumLimits);

    // Update job status with proper page tracking
    await storage.updateFlashcardJob(jobId, {
      status: "processing",
      progress: 10,
      currentTask: finalPagesToProcess < (job.pageCount || 0) 
        ? `Extracting text from first ${finalPagesToProcess} of ${job.pageCount} pages...`
        : "Extracting text from PDF...",
      pagesProcessed: finalPagesToProcess,
      updatedAt: new Date()
    });

    // Extract text from PDF with enforced page limit
    const ocrResult = await extractTextWithOCR(pdfPath, finalPagesToProcess);
    const extractedText = ocrResult.text;
    
    if (ocrResult.isScanned) {
      await storage.updateFlashcardJob(jobId, {
        progress: 25,
        currentTask: `OCR processing completed (${Math.round(ocrResult.confidence * 100)}% confidence) - ${finalPagesToProcess} pages processed`,
        updatedAt: new Date()
      });
    } else {
      await storage.updateFlashcardJob(jobId, {
        progress: 25,
        currentTask: `Text extraction completed - ${finalPagesToProcess} pages processed`,
        updatedAt: new Date()
      });
    }

    // Update user's monthly pages processed count
    await storage.incrementUserPagesProcessed(userId, finalPagesToProcess);

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
      const actualProvider = "openai/gpt-4o";
      const systemApiKey = process.env.OPENROUTER_API_KEY; // actualProvider === "openai" 
      
      if (!systemApiKey) {
        throw new Error(`${actualProvider.toUpperCase()} API key not configured`);
      }

      flashcards = await generateFlashcards(
        preprocessResult.filteredContent,
        "openai/gpt-4o",
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

    // Store files in Supabase Storage
    const tempPdfBuffer2 = fs.readFileSync(pdfPath);
    const storedPdf = await supabaseStorage.uploadPDF(userId, jobId, tempPdfBuffer2, originalFilename);
    const ankiBuffer = fs.readFileSync(ankiDeckPath);
    const storedAnki = await supabaseStorage.uploadAnkiDeck(userId, jobId, ankiBuffer);
    const exportFiles = await supabaseStorage.generateAndUploadExports(userId, jobId, flashcards);

    // Complete the job with proper page tracking
    await storage.updateFlashcardJob(jobId, {
      status: "completed",
      progress: 100,
      currentTask: `Processing complete - ${finalPagesToProcess} pages processed, ${flashcards.length} flashcards generated`,
      pagesProcessed: finalPagesToProcess, // Ensure final count is saved
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
      updatedAt: new Date()
    });



  } catch (error: any) {
    console.error(`Error processing job ${jobId}:`, error);
    await storage.updateFlashcardJob(jobId, {
      status: "failed",
      errorMessage: error?.message || "Unknown error occurred",
      currentTask: "Processing failed",
      updatedAt: new Date()
    });
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (cleanupError) {
      console.error(`Error cleaning up temp file ${pdfPath}:`, cleanupError);
    }
  }
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
      const actualProvider = "openai/gpt-4o";
      const systemApiKey = process.env.OPENROUTER_API_KEY; // actualProvider === "openai" 
      
      if (!systemApiKey) {
        throw new Error(`${actualProvider.toUpperCase()} API key not configured`);
      }

      flashcards = await generateFlashcards(
        preprocessResult.filteredContent,
        "openai/gpt-4o",
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

    // Store files in Supabase Storage
    const tempPdfBuffer = fs.readFileSync(tempPdfPath);
    const storedPdf = await supabaseStorage.uploadPDF(userId, jobId, tempPdfBuffer, originalFilename);
    const ankiBuffer = fs.readFileSync(ankiDeckPath);
    const storedAnki = await supabaseStorage.uploadAnkiDeck(userId, jobId, ankiBuffer);
    const exportFiles = await supabaseStorage.generateAndUploadExports(userId, jobId, flashcards);

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

// Enhanced spaced repetition algorithm with optimized intervals
function calculateNextReviewDate(status: string, difficultyRating?: string, reviewCount: number = 0): Date {
  const now = new Date();
  const nextDate = new Date(now);

  // Implement SM-2 inspired algorithm with improvements
  const calculateInterval = (difficulty: string, count: number, baseInterval: number): number => {
    let easeFactor = 2.5;
    
    switch (difficulty) {
      case 'easy':
        easeFactor = 2.8;
        break;
      case 'medium':
        easeFactor = 2.5;
        break;
      case 'hard':
        easeFactor = 2.2;
        break;
      default:
        easeFactor = 2.5;
    }

    // Progressive interval calculation
    if (count === 0) return baseInterval;
    if (count === 1) return Math.round(baseInterval * 1.5);
    
    return Math.round(baseInterval * Math.pow(easeFactor, count - 1));
  };

  if (status === 'known') {
    // Known cards: exponentially increasing intervals
    const baseInterval = difficultyRating === 'easy' ? 7 : 
                        difficultyRating === 'medium' ? 4 : 2;
    const intervalDays = calculateInterval(difficultyRating || 'medium', reviewCount, baseInterval);
    nextDate.setDate(now.getDate() + Math.min(intervalDays, 180)); // Cap at 6 months
  } else if (status === 'reviewing') {
    // Reviewing cards: moderate intervals
    const baseInterval = difficultyRating === 'easy' ? 3 : 
                        difficultyRating === 'medium' ? 1 : 0.5;
    const intervalDays = calculateInterval(difficultyRating || 'medium', reviewCount, baseInterval);
    
    if (intervalDays >= 1) {
      nextDate.setDate(now.getDate() + intervalDays);
    } else {
      nextDate.setHours(now.getHours() + Math.round(intervalDays * 24));
    }
  } else {
    // Unknown/new cards: short intervals for frequent practice
    if (reviewCount === 0) {
      nextDate.setMinutes(now.getMinutes() + 10); // 10 minutes for first review
    } else if (reviewCount === 1) {
      nextDate.setHours(now.getHours() + 1); // 1 hour for second review
    } else {
      nextDate.setHours(now.getHours() + 4); // 4 hours for subsequent reviews
    }
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

    // Download PDF from Supabase storage
    const pdfBuffer = await supabaseStorage.downloadFile(pdfStorageKey);
    fs.writeFileSync(tempPdfPath, pdfBuffer);

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
      ? process.env.OPENROUTER_API_KEY! 
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

    const exportResults = await supabaseStorage.generateAndUploadExports(job.userId!, jobId, flashcards);

    // Generate Anki deck
    const ankiDeckPath = await generateAnkiDeck(jobId, flashcards);
    const ankiResult = ankiDeckPath ? await supabaseStorage.uploadAnkiDeck(job.userId!, jobId, fs.readFileSync(ankiDeckPath)) : null;

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

// Regenerate flashcards process with custom context
async function regenerateFlashcardsProcess(
  jobId: number,
  originalJobId: number,
  customContext: string,
  subject: string,
  difficulty: string,
  focusAreas: any,
  flashcardCount: number,
  userId: string
) {
  let tempPdfPath: string | null = null;
  
  try {
    // Update job status
    await storage.updateFlashcardJob(jobId, {
      status: "processing",
      progress: 10,
      currentTask: "Retrieving original content...",
    });

    // Get original job content
    const originalJob = await storage.getFlashcardJob(originalJobId);
    if (!originalJob || !originalJob.pdfStorageKey) {
      throw new Error("Original PDF not found");
    }

    // Download original PDF from Supabase storage
    tempPdfPath = path.join("/tmp", `regen_${jobId}_${Date.now()}.pdf`);
    const pdfBuffer = await supabaseStorage.downloadFile(originalJob.pdfStorageKey);
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Extract text from PDF
    await storage.updateFlashcardJob(jobId, {
      progress: 25,
      currentTask: "Re-extracting text from original PDF...",
    });

    const ocrResult = await extractTextWithOCR(tempPdfPath, originalJob.pagesProcessed ?? undefined);
    const extractedText = ocrResult.text;

    // Parse focus areas and add custom context
    let focusAreasObj: any = {};
    try {
      if (typeof focusAreas === 'string') {
        focusAreasObj = JSON.parse(focusAreas);
      } else {
        focusAreasObj = focusAreas || {};
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
    const apiProvider = originalJob.apiProvider as "openai" | "anthropic";
    const apiKey = apiProvider === "openai" 
      ? process.env.OPENROUTER_API_KEY! 
      : process.env.ANTHROPIC_API_KEY!;

    const flashcards = await generateFlashcards(
      extractedText,
      apiProvider,
      apiKey,
      flashcardCount,
      subject,
      focusAreasObj,
      difficulty as "beginner" | "intermediate" | "advanced",
      customContext
    );

    // Generate and store exports
    await storage.updateFlashcardJob(jobId, {
      progress: 80,
      currentTask: "Generating export formats..."
    });

    const exportResults = await supabaseStorage.generateAndUploadExports(userId, jobId, flashcards);

    // Generate Anki deck
    const ankiDeckPath = await generateAnkiDeck(jobId, flashcards);
    const ankiResult = ankiDeckPath ? await supabaseStorage.uploadAnkiDeck(userId, jobId, fs.readFileSync(ankiDeckPath)) : null;

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
      processingTime: Math.floor((Date.now() - new Date(originalJob.createdAt!).getTime()) / 1000)
    });

    // Clean up temporary files
    try {
      if (tempPdfPath && fs.existsSync(tempPdfPath)) {
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
    
    // Clean up temporary files on error
    try {
      if (tempPdfPath && fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    } catch (cleanupError) {
      console.warn("Failed to clean up temporary files:", cleanupError);
    }
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