import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { logApiKeyStatus } from "./api-key-validator";
import { securityMiddleware } from "./security-middleware";
import { htmlTransformMiddleware } from "./html-transform";
import fs from "fs";
import path from "path";

const app = express();

// Disable X-Powered-By header globally
app.disable('x-powered-by');

// Apply security middleware
app.use(securityMiddleware);
app.use(htmlTransformMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(`${new Date().toLocaleTimeString()} [express] ${logLine}`);
    }
  });

  next();
});

async function startProductionServer() {
  try {
    console.log('✅ Starting production server...');
    logApiKeyStatus();
    
    // Register API routes with modified behavior to skip static serving
    process.env.SKIP_STATIC_SERVE = 'true';
    const server = await registerRoutes(app);
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error('Server error:', err);
    });

    // Serve static files - try multiple locations
    const staticPaths = [
      path.resolve(process.cwd(), "dist", "public"),
      path.resolve(process.cwd(), "client"),
      path.resolve(__dirname, "..", "dist", "public"),
      path.resolve(__dirname, "..", "client")
    ];
    
    let staticPath = null;
    for (const testPath of staticPaths) {
      if (fs.existsSync(testPath)) {
        staticPath = testPath;
        break;
      }
    }
    
    if (staticPath) {
      console.log(`📁 Serving static files from: ${staticPath}`);
      app.use(express.static(staticPath));
    }
    
    // Serve React app for all non-API routes
    app.get("*", (req, res) => {
      const indexPaths = [
        path.join(staticPath || "", "index.html"),
        path.resolve(process.cwd(), "client", "index.html"),
        path.resolve(__dirname, "..", "client", "index.html")
      ];
      
      let indexPath = null;
      for (const testPath of indexPaths) {
        if (fs.existsSync(testPath)) {
          indexPath = testPath;
          break;
        }
      }
      
      if (indexPath) {
        res.sendFile(indexPath);
      } else {
        // Fallback HTML response
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Smart Flashcard Generator</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                margin: 0; padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container { 
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 500px;
                width: 100%;
              }
              h1 { color: #333; margin-bottom: 20px; }
              .status { 
                color: #28a745; 
                font-weight: 600; 
                margin-bottom: 20px;
                font-size: 18px;
              }
              .btn { 
                background: #007bff; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 16px;
                margin: 10px;
              }
              .btn:hover { background: #0056b3; }
              .features {
                text-align: left;
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
              }
              .features ul {
                margin: 0;
                padding-left: 20px;
              }
              .api-status {
                color: #666;
                font-size: 14px;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🧠 Smart Flashcard Generator</h1>
              <div class="status">✅ Server is running successfully!</div>
              
              <div class="features">
                <h3>Available Features:</h3>
                <ul>
                  <li>AI-powered flashcard generation</li>
                  <li>PDF document processing</li>
                  <li>Multiple export formats (Anki, CSV, JSON)</li>
                  <li>Study mode with spaced repetition</li>
                  <li>Progress tracking</li>
                </ul>
              </div>
              
              <p>The production server is running and API endpoints are available.</p>
              
              <button class="btn" onclick="testAPI()">Test API Connection</button>
              <button class="btn" onclick="window.location.reload()">Refresh Page</button>
              
              <div class="api-status">
                API Status: <span id="api-status">Testing...</span>
              </div>
            </div>
            
            <script>
              async function testAPI() {
                try {
                  const response = await fetch('/api/auth/user');
                  document.getElementById('api-status').textContent = 
                    response.ok ? 'API Connected ✅' : 'API Error ❌';
                } catch (error) {
                  document.getElementById('api-status').textContent = 'Connection Failed ❌';
                }
              }
              
              // Auto-test API on load
              testAPI();
            </script>
          </body>
          </html>
        `);
      }
    });

    const port = 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${port}`);
      console.log(`🌐 Server accessible at http://localhost:${port}`);
      console.log(`📡 API endpoints available at http://localhost:${port}/api`);
    });

  } catch (error) {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  }
}

startProductionServer();