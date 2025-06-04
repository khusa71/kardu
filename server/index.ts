import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logApiKeyStatus } from "./api-key-validator";
import { createSecureServer, isHTTPSSupported } from "./ssl-config";
import fs from "fs";
import path from "path";

const app = express();

// Security headers and HTTPS enforcement
app.use((req, res, next) => {
  // Trust proxy settings for Replit deployments
  app.set('trust proxy', 1);
  
  // Force HTTPS in production - check multiple proxy headers
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true';
  const protocol = req.header('x-forwarded-proto') || 
                  req.header('x-scheme') || 
                  (req.secure ? 'https' : 'http');
  
  if (isProduction && protocol !== 'https') {
    const host = req.header('host') || req.header('x-forwarded-host');
    if (host) {
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }
  
  // Enhanced security headers
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: blob: https: *.stripe.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws:; " +
    "frame-src https://js.stripe.com https://checkout.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  
  next();
});

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
  
  // Run cleanup every hour
  setInterval(cleanupTempFiles, 3600000);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  
  // Try to create HTTPS server if SSL certificates are available
  const httpsServer = createSecureServer(app);
  
  if (httpsServer && process.env.NODE_ENV === 'production') {
    // Start HTTPS server on port 443 if certificates are available
    httpsServer.listen(443, '0.0.0.0', () => {
      log('HTTPS server running on port 443');
    });
    
    // Also start HTTP server for redirects
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`HTTP server running on port ${port} (redirecting to HTTPS)`);
      log(`SSL/TLS support: ${isHTTPSSupported() ? 'enabled' : 'disabled'}`);
    });
  } else {
    // Start HTTP server only
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      log(`SSL/TLS support: ${isHTTPSSupported() ? 'enabled (proxy)' : 'disabled'}`);
      if (process.env.NODE_ENV === 'production') {
        log('⚠️  Running in production without direct SSL certificates - relying on reverse proxy');
      }
    });
  }
})();
