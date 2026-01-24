import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // In production, serve from dist (built client), in dev from public
  const distPath = process.env.NODE_ENV === 'production' 
    ? path.resolve(__dirname, "../dist") 
    : path.resolve(__dirname, "public");
    
  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found: ${distPath}`);
    // Don't throw error in development, just log warning
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist, but NOT for API routes
  app.use((req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
