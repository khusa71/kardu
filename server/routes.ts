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
import { OnDemandDownloadService } from "./on-demand-downloads";

const onDemandDownloadService = new OnDemandDownloadService();

// Helper function for content types
function getContentType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'quizlet': 
    case 'anki': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

// Serve temporary files
function serveTemporaryFiles(app: Express) {
  app.use('/temp', express.static(path.join(process.cwd(), 'temp')));
}
import { verifySupabaseToken, requireEmailVerification, AuthenticatedRequest } from "./supabase-auth";
import { createNormalizedFlashcards, executeNormalizedMigration, getFlashcardsWithProgress } from "./normalized-migration";
import { updateJobProgressWithNormalizedFlashcards } from "./flashcard-migration-complete";
import { flashcards as flashcardsTable } from "@shared/schema";
import { requireApiKeys, getAvailableProvider, validateApiKeys, logApiKeyStatus } from "./api-key-validator";
import { inArray } from "drizzle-orm";
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
import { insertFlashcardJobSchema, flashcardJobs, userProfiles } from "@shared/schema";
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
  
  // Test endpoint to verify flashcards table exists
  app.get("/api/test-flashcards-table", async (req, res) => {
    try {
      // Test if flashcards table exists by querying it
      const result = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'flashcards'
      `);
      
      if (result.length > 0) {
        // Try to query the table structure
        const columns = await db.execute(sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'flashcards'
        `);
        
        res.json({
          exists: true,
          structure: columns,
          message: "Flashcards table exists and is accessible"
        });
      } else {
        res.json({
          exists: false,
          message: "Flashcards table does NOT exist in database"
        });
      }
    } catch (error) {
      res.status(500).json({
        exists: false,
        error: error.message,
        message: "Error checking flashcards table"
      });
    }
  });

  // Create flashcards table endpoint
  app.post("/api/create-flashcards-table", async (req, res) => {
    try {
      // Create the flashcards table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS flashcards (
          id SERIAL PRIMARY KEY,
          job_id INTEGER NOT NULL,
          user_id VARCHAR NOT NULL,
          card_index INTEGER NOT NULL,
          front TEXT NOT NULL,
          back TEXT NOT NULL,
          subject TEXT,
          difficulty TEXT,
          tags TEXT[],
          confidence NUMERIC(3,2),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_flashcards_job ON flashcards(job_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_flashcards_unique ON flashcards(job_id, card_index)`);

      // Add foreign key constraints
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE flashcards 
          ADD CONSTRAINT fk_flashcards_job 
          FOREIGN KEY (job_id) REFERENCES flashcard_jobs(id) ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE flashcards 
          ADD CONSTRAINT fk_flashcards_user 
          FOREIGN KEY (user_id) REFERENCES user_profiles(id);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      res.json({
        success: true,
        message: "Flashcards table created successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to create flashcards table"
      });
    }
  });

  // Update study_progress table for flashcard_id references
  app.post("/api/update-study-progress-table", async (req, res) => {
    try {
      // Add flashcard_id column if it doesn't exist
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD COLUMN flashcard_id INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // Add enhanced progress tracking columns
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD COLUMN correct_streak INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD COLUMN total_reviews INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD COLUMN correct_reviews INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // Add foreign key constraint to flashcards table
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD CONSTRAINT fk_study_progress_flashcard 
          FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      res.json({
        success: true,
        message: "Study progress table updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        message: "Failed to update study progress table"
      });
    }
  });

  // Test normalized flashcard creation with real job
  app.post("/api/test-normalized-flashcards/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      
      // Get job details
      const job = await db.execute(sql`SELECT * FROM flashcard_jobs WHERE id = ${jobId}`);
      if (!job.length) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const jobData = job[0] as any;
      
      // Test creating normalized flashcards
      const testFlashcards = [
        { front: "Test Question 1", back: "Test Answer 1" },
        { front: "Test Question 2", back: "Test Answer 2" }
      ];
      
      await createNormalizedFlashcards(
        jobId, 
        jobData.user_id, 
        testFlashcards, 
        jobData.subject || 'Test Subject', 
        jobData.difficulty || 'beginner'
      );
      
      // Verify flashcards were created
      const created = await db.execute(sql`
        SELECT * FROM flashcards WHERE job_id = ${jobId}
      `);
      
      res.json({
        success: true,
        message: "Normalized flashcards created successfully",
        flashcardsCreated: created.length,
        flashcards: created
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        message: "Normalized flashcard creation failed"
      });
    }
  });

  // Check and update all table structures for normalized flashcards
  app.post("/api/update-all-table-structures", async (req, res) => {
    try {
      // 1. Remove flashcards JSON column from flashcard_jobs table
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE flashcard_jobs DROP COLUMN IF EXISTS flashcards;
        EXCEPTION
          WHEN undefined_column THEN NULL;
        END $$;
      `);

      // 2. Update study_progress to use flashcard_id instead of card_index
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD COLUMN flashcard_id INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // 3. Add foreign key constraint to flashcards
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD CONSTRAINT fk_study_progress_flashcard 
          FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      // 4. Add enhanced progress tracking columns
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_progress 
          ADD COLUMN correct_streak INTEGER DEFAULT 0,
          ADD COLUMN total_reviews INTEGER DEFAULT 0,
          ADD COLUMN correct_reviews INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // 5. Check if study_sessions table needs flashcard references
      await db.execute(sql`
        DO $$ BEGIN
          ALTER TABLE study_sessions 
          ADD COLUMN flashcard_count INTEGER DEFAULT 0;
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // Get updated table structures
      const flashcardJobsStructure = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'flashcard_jobs'
        ORDER BY ordinal_position
      `);

      const studyProgressStructure = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'study_progress'
        ORDER BY ordinal_position
      `);

      const studySessionsStructure = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'study_sessions'
        ORDER BY ordinal_position
      `);

      res.json({
        success: true,
        message: "All table structures updated for normalized flashcards",
        updatedTables: {
          flashcard_jobs: flashcardJobsStructure,
          study_progress: studyProgressStructure,
          study_sessions: studySessionsStructure
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        message: "Failed to update table structures"
      });
    }
  });

  // Migrate existing study_progress records to use flashcard_id references
  app.post("/api/migrate-study-progress-flashcard-refs", async (req, res) => {
    try {
      // Get all study_progress records without flashcard_id
      const progressRecords = await db.execute(sql`
        SELECT sp.id, sp.job_id, sp.card_index, sp.user_id
        FROM study_progress sp
        WHERE sp.flashcard_id IS NULL
      `);

      let migratedCount = 0;

      for (const record of progressRecords) {
        // Find corresponding flashcard by job_id and card_index
        const flashcardResult = await db.execute(sql`
          SELECT id FROM flashcards 
          WHERE job_id = ${record.job_id} AND card_index = ${record.card_index}
          LIMIT 1
        `);

        if (flashcardResult.length > 0) {
          const flashcardId = flashcardResult[0].id;
          
          // Update study_progress record with flashcard_id
          await db.execute(sql`
            UPDATE study_progress 
            SET flashcard_id = ${flashcardId}
            WHERE id = ${record.id}
          `);
          
          migratedCount++;
        }
      }

      res.json({
        success: true,
        message: `Migrated ${migratedCount} study progress records to use flashcard_id references`,
        totalRecords: progressRecords.length,
        migratedRecords: migratedCount
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        message: "Failed to migrate study progress flashcard references"
      });
    }
  });

  // Test normalized study functionality
  app.post("/api/test-normalized-study/:jobId", async (req, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = "29012732-3c3e-465f-ab37-10cf9eccfd57"; // Test user

      // Get flashcards for this job
      const flashcardsResult = await db.execute(sql`
        SELECT * FROM flashcards WHERE job_id = ${jobId} ORDER BY card_index
      `);

      if (flashcardsResult.length === 0) {
        return res.status(404).json({ error: "No flashcards found for this job" });
      }

      // Get study progress for these flashcards
      const progressResult = await db.execute(sql`
        SELECT sp.*, f.front, f.back 
        FROM study_progress sp
        JOIN flashcards f ON sp.flashcard_id = f.id
        WHERE sp.user_id = ${userId} AND sp.job_id = ${jobId}
      `);

      // Create some test progress if none exists
      if (progressResult.length === 0) {
        for (const flashcard of flashcardsResult.slice(0, 2)) {
          await db.execute(sql`
            INSERT INTO study_progress (user_id, job_id, card_index, flashcard_id, status)
            VALUES (${userId}, ${jobId}, ${flashcard.card_index}, ${flashcard.id}, 'new')
          `);
        }

        // Re-fetch progress
        const newProgressResult = await db.execute(sql`
          SELECT sp.*, f.front, f.back 
          FROM study_progress sp
          JOIN flashcards f ON sp.flashcard_id = f.id
          WHERE sp.user_id = ${userId} AND sp.job_id = ${jobId}
        `);

        return res.json({
          success: true,
          message: "Normalized study system working correctly",
          flashcardsCount: flashcardsResult.length,
          progressRecords: newProgressResult.length,
          testData: {
            flashcards: flashcardsResult,
            progress: newProgressResult
          }
        });
      }

      res.json({
        success: true,
        message: "Normalized study system working correctly",
        flashcardsCount: flashcardsResult.length,
        progressRecords: progressResult.length,
        testData: {
          flashcards: flashcardsResult,
          progress: progressResult
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        message: "Normalized study system test failed"
      });
    }
  });

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
            isPremium: false
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
        });
      }

      // Check current monthly usage and reset if needed
      const { uploadsRemaining } = await storage.checkUploadLimit(userId);
      const updatedUser = await storage.getUserProfile(userId); // Get fresh data after potential reset
      
      // Calculate correct monthly usage data  
      const currentUploads = 0; // Default for existing users
      const monthlyLimit = updatedUser?.isPremium ? 100 : 3;
      
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
        monthlyUploads: currentUploads,
        monthlyLimit,
        uploadsRemaining,
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
            flashcardCount: parseInt(flashcardCount),
            subject: subject || "general",
            difficulty: difficulty || "intermediate",
            focusAreas: JSON.stringify(focusAreas || {}),
            status: "pending" as const,
            progress: 0,
            currentTask: validation.pagesWillProcess < validation.pageInfo.pageCount 
              ? `Processing first ${validation.pagesWillProcess} of ${validation.pageInfo.pageCount} pages...`
              : "Starting processing...",
            pdfStorageKey: `temp_${Date.now()}_${file.originalname}`, // Temporary key, will be updated when PDF is uploaded
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
              // Update job status to failed
              storage.updateFlashcardJob(job.id, {
                status: "failed",
                errorMessage: error.message,
                currentTask: "Processing failed"
              }).catch(updateError => {
                // Silent failure - avoid memory bloat
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
      console.error("Upload processing error:", error);
      res.status(500).json({ 
        message: "Upload failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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
    const model = "anthropic/claude-3.5-sonnet"; // Default model
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

    // Create normalized flashcard records
    const normalizedFlashcards = flashcards.map((card: any, index: number) => ({
      jobId: job.id,
      userId: job.userId!,
      cardIndex: index,
      front: card.front || card.question || '',
      back: card.back || card.answer || '',
      subject: card.subject || job.subject || '',
      difficulty: card.difficulty || job.difficulty || 'beginner',
      tags: card.tags || [],
      confidence: card.confidence ? card.confidence.toString() : null,
    }));

    // Store flashcards in normalized table
    await createNormalizedFlashcards(job.id, job.userId!, flashcards, job.subject || '', job.difficulty || 'beginner');

    // Complete the job
    await storage.updateFlashcardJob(jobId, {
      status: "completed",
      progress: 100,
      currentTask: "Processing complete",
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
      
      // Delete PDF file from object storage
      if (job.pdfStorageKey) {
        try {
          await supabaseStorage.deleteFile(job.pdfStorageKey);
        } catch (error) {
          console.error(`Failed to delete PDF file ${job.pdfStorageKey}:`, error);
        }
      }
      
      // Delete job from database
      const deleted = await storage.deleteFlashcardJob(jobId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete job from database" });
      }
      
      res.json({ 
        message: "Job deleted successfully"
      });
      
    } catch (error) {
      console.error("Job deletion error:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Download original PDF
  app.get("/api/download/pdf/:id", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const job = await storage.getFlashcardJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      if (job.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      if (!job.pdfStorageKey) {
        return res.status(404).json({ message: "PDF not available" });
      }
      
      // Generate signed download URL from Supabase Storage
      const { data, error } = await supabaseStorage.createSignedUrl(
        job.pdfStorageKey,
        300 // 5 minutes expiry
      );
      
      if (error || !data?.signedUrl) {
        console.error("PDF download error:", error);
        return res.status(500).json({ message: "Failed to generate download link" });
      }
      
      res.json({
        downloadUrl: data.signedUrl,
        filename: job.filename,
        expiresIn: 300
      });
    } catch (error: any) {
      console.error("PDF download error:", error);
      res.status(500).json({ message: "Download failed" });
    }
  });

  // Download Anki deck (legacy endpoint - redirects to new export system)
  app.get("/api/download/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      // Redirect to new export endpoint for Anki format
      res.redirect(`/api/export/${jobId}/anki`);
    } catch (error: any) {
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
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        processingTime: job.processingTime,
        hasFlashcards: job.flashcardCount > 0,
        canExport: job.status === 'completed' && job.flashcardCount > 0,
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
        job.status === 'completed' && job.flashcardCount > 0
      );

      // Transform jobs into deck format with metadata
      const decks = completedJobs.map(job => {
        const flashcardCount = job.flashcardCount || 0;
        const previewCards: any[] = []; // Preview cards will be loaded separately if needed

        return {
          id: job.id,
          name: job.filename.replace(/\.[^/.]+$/, ""), // Remove file extension
          filename: job.filename,
          subject: job.subject,
          difficulty: job.difficulty,
          cardCount: flashcardCount,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
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

      if (job.status !== "completed" || job.flashcardCount === 0) {
        return res.status(404).json({ message: "Flashcards not ready" });
      }

      // Get the appropriate storage key based on format
      if (!['csv', 'json', 'quizlet', 'anki'].includes(format)) {
        return res.status(400).json({ message: "Unsupported format" });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ message: "Job not completed yet" });
      }

      try {
        // Generate file on-demand using normalized flashcard data
        const downloadResult = await onDemandDownloadService.generateDownload(
          userId, 
          jobId, 
          format as 'csv' | 'json' | 'quizlet' | 'anki'
        );
        
        res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.filename}"`);
        res.setHeader('Content-Type', getContentType(format));
        
        const fileBuffer = require('fs').readFileSync(downloadResult.filePath);
        res.send(fileBuffer);
        
        // Clean up temp file after sending
        setTimeout(() => {
          try {
            require('fs').unlinkSync(downloadResult.filePath);
          } catch (e) {
            console.error('Failed to cleanup temp file:', e);
          }
        }, 1000);
      } catch (downloadError: any) {
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
  app.get("/api/stats/:id", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = req.user!.id;
      const job = await storage.getFlashcardJob(jobId);
      
      if (!job || job.status !== "completed" || job.flashcardCount === 0) {
        return res.status(404).json({ message: "Flashcards not ready" });
      }

      // Get flashcards from normalized table
      const flashcards = await getFlashcardsWithProgress(jobId, userId);
      // Convert to FlashcardPair format for compatibility
      const flashcardPairs = flashcards.map(card => ({
        front: card.front,
        back: card.back,
        subject: card.subject || '',
        difficulty: (card.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner'
      }));
      const stats = exportService.generateStudyStats(flashcardPairs);
      
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

      // Create Stripe customer
      let customerId;
      {
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

      // Get flashcard ID from normalized table using card index
      const flashcardRecords = await db.select({ id: flashcardsTable.id })
        .from(flashcardsTable)
        .where(and(eq(flashcardsTable.jobId, jobId), eq(flashcardsTable.cardIndex, cardIndex)))
        .limit(1);

      if (flashcardRecords.length === 0) {
        return res.status(404).json({ error: "Flashcard not found" });
      }

      const progressData = {
        userId,
        jobId,
        cardIndex, // Keep for compatibility with storage interface
        flashcardId: flashcardRecords[0].id,
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

      // Get flashcard IDs for all card indices in batch
      const cardIndices = progressUpdates.map((update: any) => update.cardIndex);
      const flashcardRecords = await db.select({ id: flashcardsTable.id, cardIndex: flashcardsTable.cardIndex })
        .from(flashcardsTable)
        .where(and(eq(flashcardsTable.jobId, parseInt(jobId)), inArray(flashcardsTable.cardIndex, cardIndices)));

      // Create mapping from cardIndex to flashcardId
      const cardIndexToFlashcardId = new Map();
      flashcardRecords.forEach(record => {
        cardIndexToFlashcardId.set(record.cardIndex, record.id);
      });

      // Prepare batch data with flashcard IDs and calculated review dates
      const batchData = progressUpdates.map((update: any) => ({
        userId,
        jobId: parseInt(jobId),
        cardIndex: update.cardIndex, // Keep for compatibility with storage interface
        flashcardId: cardIndexToFlashcardId.get(update.cardIndex),
        status: update.status,
        difficultyRating: update.difficultyRating,
        lastReviewedAt: new Date(),
        nextReviewDate: calculateNextReviewDate(update.status, update.difficultyRating, update.reviewCount || 0)
      })).filter(item => item.flashcardId); // Filter out items without valid flashcard IDs

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

  // Study session management endpoints
  app.post("/api/study-sessions", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { jobId, totalCards } = req.body;
      const userId = req.user!.id;

      const sessionData = {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        jobId: parseInt(jobId),
        startTime: new Date(),
        totalCards,
        status: 'active'
      };

      const session = await storage.createStudySession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create study session" });
    }
  });

  app.put("/api/study-sessions/:sessionId/complete", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.params;
      const { cardsStudied, accuracy } = req.body;

      const completedSession = await storage.completeStudySession(sessionId, {
        cardsStudied: parseInt(cardsStudied),
        accuracy: parseInt(accuracy)
      });

      res.json(completedSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete study session" });
    }
  });

  app.get("/api/study-sessions", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;

      const sessions = await storage.getUserStudySessions(userId, jobId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get study sessions" });
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

      // Delete existing flashcards for this job
      await db.delete(flashcardsTable).where(eq(flashcardsTable.jobId, jobId));

      // Insert new normalized flashcards
      if (flashcards && flashcards.length > 0) {
        const normalizedFlashcards = flashcards.map((card: any, index: number) => ({
          jobId,
          userId,
          cardIndex: index,
          front: card.front || '',
          back: card.back || '',
          subject: card.subject || job.subject || '',
          difficulty: card.difficulty || job.difficulty || 'beginner',
          tags: card.tags || [],
          confidence: card.confidence ? parseFloat(card.confidence) : null,
        }));

        await db.insert(flashcardsTable).values(normalizedFlashcards);
      }

      // Update job metadata
      const updatedJob = await storage.updateFlashcardJob(jobId, {
        flashcardCount: flashcards ? flashcards.length : 0,
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
        focusAreas: customContext ? JSON.stringify({ custom: customContext }) : originalJob.focusAreas,
        pdfStorageKey: originalJob.pdfStorageKey,
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
      
      // Check if user has admin privileges (simplified check for now)
      if (!user) {
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
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      const recentUsersResult = await db.select({ count: sql<number>`count(*)` })
        .from(userProfiles)
        .where(sql`${userProfiles.createdAt} >= ${thirtyDaysAgoISO}`);
      
      const recentJobsResult = await db.select({ count: sql<number>`count(*)` })
        .from(flashcardJobs)
        .where(sql`${flashcardJobs.createdAt} >= ${thirtyDaysAgoISO}`);

      // Get API provider usage (simplified calculation)
      // API provider stats not available due to database schema
      const openaiJobs = 0;
      const anthropicJobs = 0;

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
  app.post("/api/verify-subscription", verifySupabaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Check current subscription status
      const users = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        isPremium: user.isPremium || false,
        subscriptionStatus: 'active'
      });
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

      // Create normalized flashcards from cache
      await createNormalizedFlashcards(jobId, userId, flashcards, subject, difficulty);
      await storage.updateFlashcardJob(jobId, {
        progress: 80,
        currentTask: "Retrieved from cache (cost-optimized)",
        flashcardCount: flashcards.length,
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

      // Create normalized flashcards from AI generation
      await createNormalizedFlashcards(jobId, userId, flashcards, subject, difficulty);

      await storage.updateFlashcardJob(jobId, {
        progress: 75,
        currentTask: "Creating flashcard pairs",
        flashcardCount: flashcards.length,
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
      
      // Create normalized flashcards from cache
      await createNormalizedFlashcards(jobId, userId, flashcards, subject, difficulty);
      await storage.updateFlashcardJob(jobId, {
        progress: 80,
        currentTask: "Retrieved from cache (cost-optimized)",
        flashcardCount: flashcards.length,
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

      // Create normalized flashcards from AI generation
      await createNormalizedFlashcards(jobId, userId, flashcards, subject, difficulty);

      await storage.updateFlashcardJob(jobId, {
        progress: 75,
        currentTask: "Creating flashcard pairs",
        flashcardCount: flashcards.length,
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

    // Use OpenRouter API for regeneration
    const apiProvider = "openai/gpt-4o";
    const apiKey = process.env.OPENROUTER_API_KEY!;

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
      flashcardCount: flashcards.length,
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

    // Use OpenRouter API for regeneration
    const apiProvider = "openai/gpt-4o";
    const apiKey = process.env.OPENROUTER_API_KEY!;

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
      flashcardCount: flashcards.length,
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