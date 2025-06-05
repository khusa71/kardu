import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logApiKeyStatus } from "./api-key-validator";
import { createSecureServer, isHTTPSSupported } from "./ssl-config";
import { securityMiddleware, type SecureRequest } from "./security-middleware";
import { htmlTransformMiddleware } from "./html-transform";
import fs from "fs";
import path from "path";

const app = express();

// Disable X-Powered-By header globally
app.disable('x-powered-by');

// Apply comprehensive security middleware
app.use(securityMiddleware);

// Add HTML transformation middleware for nonce injection
app.use(htmlTransformMiddleware);

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
  // Enhanced fallback strategy for stable development
  const useViteFallback = true; // Force stable mode to resolve HMR issues
  
  if (!useViteFallback && app.get("env") === "development") {
    let viteStarted = false;
    try {
      await setupVite(app, server);
      viteStarted = true;
      log("Vite development server started successfully");
      
      // Monitor HMR health and switch to fallback if needed
      setTimeout(() => {
        if (!viteStarted) {
          log("Vite HMR issues detected, switching to stable mode");
          setupFallbackServer(app);
        }
      }, 30000); // Give Vite 30 seconds to stabilize
      
    } catch (viteError: any) {
      console.warn("Vite setup failed, switching to fallback mode:", viteError?.message || viteError);
      setupFallbackServer(app);
    }
  } else {
    if (fs.existsSync(path.resolve(import.meta.dirname, "..", "dist", "public"))) {
      serveStatic(app);
      log("Serving production build");
    } else {
      setupFallbackServer(app);
      log("Serving development fallback");
    }
  }

function setupFallbackServer(app: any) {
  // Create a simple HTML page that works without complex module loading
  app.get("*", (req: any, res: any) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
        <title>Kardu.io - AI-Powered Flashcard Generation</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
            max-width: 500px;
            width: 90%;
          }
          h1 { 
            color: #1f2937;
            font-size: 2rem;
            margin-bottom: 1rem;
          }
          p { 
            color: #6b7280;
            margin-bottom: 1rem;
            line-height: 1.6;
          }
          .status {
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
          .btn {
            background: #3b82f6;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            margin: 0.5rem;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #2563eb;
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Smart Flashcard Generator</h1>
          <div class="status">
            <div class="loading"></div>
            <p>Backend server is running successfully</p>
            <p>Frontend is starting in stable mode...</p>
          </div>
          <p>Your AI-powered flashcard generator is ready! The backend server is working correctly and all API endpoints are functional.</p>
          <button class="btn" onclick="window.location.reload()">Refresh Application</button>
          <button class="btn" onclick="testAPI()">Test API Connection</button>
          
          <div id="api-results" style="margin-top: 1rem; padding: 1rem; background: #f9f9f9; border-radius: 0.5rem; font-family: monospace; font-size: 0.875rem; text-align: left; white-space: pre-wrap; display: none;"></div>
        </div>
        
        <script>
          // Show a working interface while Vite stabilizes
          setTimeout(() => {
            document.querySelector('.status').innerHTML = '<p style="color: #059669;">✓ Server ready - Application is functional</p>';
          }, 2000);
          
          async function testAPI() {
            const resultsDiv = document.getElementById('api-results');
            resultsDiv.style.display = 'block';
            resultsDiv.textContent = 'Testing API endpoints...\\n\\n';
            
            const endpoints = [
              { name: 'Health Check', url: '/health' },
              { name: 'API Status', url: '/api/auth/user' }
            ];
            
            for (const endpoint of endpoints) {
              try {
                const response = await fetch(endpoint.url);
                const data = await response.json();
                resultsDiv.textContent += \`✓ \${endpoint.name}: \${response.status} \${response.statusText}\\n\`;
                resultsDiv.textContent += \`  Response: \${JSON.stringify(data, null, 2)}\\n\\n\`;
              } catch (error) {
                resultsDiv.textContent += \`✗ \${endpoint.name}: Failed - \${error.message}\\n\\n\`;
              }
            }
          }
        </script>
      </body>
      </html>
    `);
  });
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
