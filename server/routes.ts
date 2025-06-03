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
import { insertFlashcardJobSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

// Configure multer for file uploads (memory storage to avoid local files)
const upload = multer({
  storage: multer.memoryStorage(),
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

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Raw body middleware for Stripe webhooks
  app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
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
  app.post("/api/upload", verifyFirebaseToken as any, checkUploadLimits as any, upload.single("pdf"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }

      const userId = req.user!.uid;
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
        subject: subject || "general",
        difficulty: difficulty || "intermediate",
        focusAreas: JSON.stringify(focusAreas || {}),
        status: "pending" as const,
        progress: 0,
        currentTask: "Starting processing...",
      };

      // Create job record
      const job = await storage.createFlashcardJob(jobData);

      // Increment user upload count
      await storage.incrementUserUploads(userId);

      // Start processing asynchronously
      processFlashcardJob(job.id, req.file.buffer, req.file.originalname, apiProvider, subject, focusAreas, difficulty, userId, flashcardCount);

      res.json({ 
        jobId: job.id, 
        status: "pending",
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

  // Object Storage download endpoint
  app.get("/api/object-storage/download/:key(*)", verifyFirebaseToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const storageKey = req.params.key;
      const userId = req.user!.uid;
      
      // Verify that the file belongs to the user
      const userPrefix = `users/${userId}/`;
      if (!storageKey.startsWith(userPrefix)) {
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

  // Stripe webhook handler
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.status(400).send("Missing webhook secret");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log(`Webhook received: ${event.type} (ID: ${event.id})`);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
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

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      console.error("Event data:", JSON.stringify(event, null, 2));
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Manual subscription verification endpoint (fallback for webhook failures)
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
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        await storage.updateUserSubscription(userId, {
          subscriptionId: subscription.id,
          status: subscription.status,
          periodEnd: new Date((subscription as any).current_period_end * 1000),
        });

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
  flashcardCount: string
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

      // Get system-managed API key based on provider
      const systemApiKey = apiProvider === "openai" 
        ? process.env.OPENAI_API_KEY 
        : process.env.ANTHROPIC_API_KEY;
      
      if (!systemApiKey) {
        throw new Error(`${apiProvider.toUpperCase()} API key not configured`);
      }

      flashcards = await generateFlashcards(
        preprocessResult.filteredContent,
        apiProvider as "openai" | "anthropic",
        systemApiKey,
        parseInt(flashcardCount),
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