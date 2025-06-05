#!/usr/bin/env node

// Temporary production server to bypass Vite connection issues
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 5000;

// Serve static files from dist directory if it exists
const distPath = path.join(__dirname, 'dist', 'public');
const clientPath = path.join(__dirname, 'client');

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes placeholder
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Serve the React app
app.get('*', (req, res) => {
  const indexPath = path.join(clientPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Smart Flashcard Generator</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; text-align: center; }
            .error { color: #dc3545; }
            .loading { color: #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Smart Flashcard Generator</h1>
            <p class="loading">Starting development server...</p>
            <p>If this page persists, the development server is having connection issues.</p>
            <p>Please refresh the page in a few moments.</p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production fallback server running on port ${PORT}`);
  console.log(`Server accessible at http://localhost:${PORT}`);
});