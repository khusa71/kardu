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
  // Implement stable fallback for Vite connection issues
  const useViteFallback = process.env.USE_VITE_FALLBACK === "true" || process.env.NODE_ENV === "production";
  
  if (!useViteFallback && app.get("env") === "development") {
    try {
      await setupVite(app, server);
      log("Vite development server started successfully");
    } catch (viteError) {
      console.warn("Vite setup failed, switching to fallback mode:", viteError.message);
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
  // Serve static assets from client directory
  app.use('/src', express.static(path.resolve(import.meta.dirname, "..", "client", "src")));
  app.use('/node_modules', express.static(path.resolve(import.meta.dirname, "..", "node_modules")));
  
  // Handle all routes by serving the index.html with inline development setup
  app.get("*", (req, res) => {
    const indexPath = path.resolve(import.meta.dirname, "..", "client", "index.html");
    
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      
      // Replace the module script with a version that works without Vite HMR
      html = html.replace(
        '<script type="module" src="/src/main.tsx"></script>',
        `<script type="module">
          // Fallback development mode without Vite HMR
          import { createElement } from '/node_modules/react/index.js';
          import { createRoot } from '/node_modules/react-dom/client.js';
          
          // Create a simple loading component
          const LoadingApp = () => createElement('div', {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              fontFamily: 'Arial, sans-serif',
              flexDirection: 'column'
            }
          }, [
            createElement('h1', { key: 'title' }, 'Smart Flashcard Generator'),
            createElement('p', { key: 'loading' }, 'Loading application...'),
            createElement('p', { key: 'note', style: { color: '#666', fontSize: '14px' } }, 
              'Development server is starting. Please refresh in a moment if this persists.')
          ]);
          
          const root = createRoot(document.getElementById('root'));
          root.render(createElement(LoadingApp));
          
          // Auto-refresh after 5 seconds to check if Vite is working
          setTimeout(() => {
            if (confirm('Refresh page to try loading the full application?')) {
              window.location.reload();
            }
          }, 5000);
        </script>`
      );
      
      res.send(html);
    } else {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Smart Flashcard Generator</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #dc3545; }
            .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Smart Flashcard Generator</h1>
            <p class="error">Development server is starting...</p>
            <p>There seems to be a configuration issue. Please wait a moment and refresh the page.</p>
            <button class="btn" onclick="window.location.reload()">Refresh Page</button>
          </div>
        </body>
        </html>
      `);
    }
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
