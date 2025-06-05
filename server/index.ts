import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logApiKeyStatus } from "./api-key-validator";
import { healthMonitor } from "./health-monitor";
import { monitoringService } from "./monitoring-service";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
        
        // Remove files older than 1 hour
        if (age > 3600000) {
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
  
  // Run cleanup every hour
  setInterval(cleanupTempFiles, 3600000);
  
  const server = await registerRoutes(app);

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

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`);
    console.error(err);
    process.exit(1);
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
