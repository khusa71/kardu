import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logApiKeyStatus } from "./api-key-validator";
import { healthMonitor } from "./health-monitor";
import { monitoringService } from "./monitoring-service";

import fs from "fs";
import path from "path";

const app = express();

// Apply helmet security middleware with custom configuration
app.use(helmet({
  contentSecurityPolicy: false, // We'll use our custom CSP
  hsts: false, // We'll use our custom HSTS
  frameguard: false, // We'll use our custom X-Frame-Options
  crossOriginEmbedderPolicy: false, // Custom COEP policy
}));

// Basic security headers handled by helmet

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: false, limit: '25mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Record metrics for monitoring
      monitoringService.recordRequest(duration, res.statusCode >= 400);
      
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Global error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Global error handler:', err);
  
  // Log error details for monitoring
  if (monitoringService) {
    monitoringService.recordRequest(0, true);
  }
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'File too large',
      message: 'Please upload a smaller file'
    });
  }
  
  if (err.code === 'ENOENT') {
    return res.status(404).json({
      error: 'File not found',
      message: 'The requested file could not be found'
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Cleanup function to remove temporary files
function cleanupTempFiles() {
  try {
    const tempDir = "/tmp";
    const files = fs.readdirSync(tempDir);
    
    // Remove old temporary PDF and Anki files
    files.forEach(file => {
      if (file.match(/^(temp_|deck_)\d+/) && file.endsWith('.pdf') || file.endsWith('.apkg')) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtime.getTime();
        
        // Remove files older than 30 minutes for aggressive cleanup
        if (age > 1800000) {
          fs.unlinkSync(filePath);
          log(`Cleaned up old temp file: ${file}`);
        }
      }
    });
  } catch (error) {
    log(`Temp cleanup error: ${error}`);
  }
}

(async () => {
  // Clean up any existing temporary files on startup
  cleanupTempFiles();
  
  // Log API key configuration status
  logApiKeyStatus();
  
  // Start health monitoring
  healthMonitor.startMonitoring();
  
  // Start performance monitoring
  monitoringService.startPeriodicCollection();
  
  // Run cleanup every 30 minutes for aggressive memory management
  setInterval(cleanupTempFiles, 1800000);
  
  // Force garbage collection every 10 minutes to reduce memory usage
  if (typeof global !== 'undefined' && 'gc' in global && typeof global.gc === 'function') {
    setInterval(() => {
      try {
        (global as any).gc();
      } catch (error) {
        // Garbage collection not available
      }
    }, 600000);
  }
  
  const server = await registerRoutes(app);

  // Add explicit API route handler to prevent vite middleware from intercepting API calls
  app.use('/api/*', (req, res, next) => {
    // If we reach here, the API route wasn't handled properly
    // This should not happen if routes are properly registered
    console.error(`Unhandled API route: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Add graceful shutdown handling
  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully');
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });
  });

  // Handle unhandled promise rejections with proper logging
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    // Log to monitoring service if available
    if (monitoringService) {
      monitoringService.recordRequest(0, true);
    }
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    console.error('Stack:', err.stack);
    // Attempt graceful shutdown
    server.close(() => {
      process.exit(1);
    });
    // Force exit after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log detailed error information for debugging
    log(`Error ${status} on ${req.method} ${req.path}: ${message}`);
    
    // Don't expose internal errors in production
    const responseMessage = status === 500 && process.env.NODE_ENV === 'production' 
      ? "Internal Server Error" 
      : message;

    res.status(status).json({ message: responseMessage });
    
    // Only throw the error if it's not a client error (4xx)
    if (status >= 500) {
      console.error('Server Error:', err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
