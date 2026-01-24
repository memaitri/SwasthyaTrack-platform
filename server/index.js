// server/index.js
import 'dotenv/config'; // ✅ Load .env first
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { db } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./auth.js";

// Global error handlers to prevent connection pool dumps
process.on('unhandledRejection', (reason, _promise) => {
  const errorMessage = reason?.message || String(reason) || 'Unhandled Promise Rejection';
  // Only log the error message, not the full object
  if (errorMessage && !errorMessage.includes('DbHandler')) {
    console.error('Unhandled Rejection:', errorMessage);
  }
  // Don't exit in development, just log
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  const errorMessage = error?.message || String(error) || 'Uncaught Exception';
  // Only log the error message, not the full object
  if (errorMessage && !errorMessage.includes('DbHandler')) {
    console.error('Uncaught Exception:', errorMessage);
  }
  // Don't exit in development, just log
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

const app = express();
const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// ✅ Add this right after middlewares
app.use("/api/auth", authRoutes);

// Simple logger
function log(message, source = "express") {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${time} [${source}] ${message}`);
}

// API request logger
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse;

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
        // Limit JSON stringify to prevent huge dumps (like connection pools)
        try {
          const jsonStr = JSON.stringify(capturedJsonResponse);
          // Truncate if too long (prevent connection pool dumps)
          if (jsonStr.length > 1000) {
            logLine += ` :: ${jsonStr.substring(0, 1000)}... (truncated)`;
          } else {
            logLine += ` :: ${jsonStr}`;
          }
        } catch (e) {
          logLine += ` :: [Response too large to stringify]`;
        }
      }
      log(logLine);
    }
  });

  next();
});

// Error handler
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err?.message || String(err) || "Internal Server Error";
  res.status(status).json({ message });
  log(`Error: ${message}`, "error");
});

// Main async bootstrap
(async () => {
  try {
    // Test database connection
    try {
      await db.execute("SELECT 1");
      log("Database connection successful");

      // Fixup for approval workflow: mark existing active schools as Approved
      try {
        await db.execute("UPDATE schools SET approval_status = 'Approved' WHERE is_active = true");
        log("Migration check: existing active schools marked as Approved where necessary");
      } catch (uqErr) {
        console.warn("Migration check: failed to adjust existing school approval statuses:", uqErr?.message || String(uqErr));
      }

      // DB compatibility: ensure `pran_no` exists (migrate from `mcts_no` if present)
      try {
        await db.execute(`
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='pran_no') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='mcts_no') THEN
      ALTER TABLE students ADD COLUMN pran_no text;
      UPDATE students SET pran_no = mcts_no WHERE pran_no IS NULL AND mcts_no IS NOT NULL;
      ALTER TABLE students DROP COLUMN IF EXISTS mcts_no;
    ELSE
      ALTER TABLE students ADD COLUMN pran_no text;
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='annual_health_cards' AND column_name='pran_no') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='annual_health_cards' AND column_name='mcts_no') THEN
      ALTER TABLE annual_health_cards ADD COLUMN pran_no text;
      UPDATE annual_health_cards SET pran_no = mcts_no WHERE pran_no IS NULL AND mcts_no IS NOT NULL;
      ALTER TABLE annual_health_cards DROP COLUMN IF EXISTS mcts_no;
    ELSE
      ALTER TABLE annual_health_cards ADD COLUMN pran_no text;
    END IF;
  END IF;
END $;
        `);
        log("DB compatibility: ensured pran_no columns exist and migrated from mcts_no when present");
      } catch (compatErr) {
        console.warn("DB compatibility migration failed:", compatErr?.message || String(compatErr));
      }

    } catch (dbError) {
      console.error("Database connection failed:", dbError?.message || String(dbError));
      console.error("Please check your DATABASE_URL and database availability");
      process.exit(1);
    }

    // Serve frontend: Vite in dev, static in prod
    if (process.env.NODE_ENV === "production") {
      // Register API routes FIRST
      await registerRoutes(httpServer, app);
      // Path to built frontend - Railway builds to /dist at root
      const clientDist = path.join(__dirname, "../../dist");
      // Serve frontend static files
      app.use(express.static(clientDist));
      // SPA fallback for client-side routing
      app.get("*", (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ message: 'API route not found' });
        }
        res.sendFile(path.join(clientDist, "index.html"));
      });
    } else {
      const { setupVite } = await import("./vite.js");
      await setupVite(httpServer, app);
      // Routes are registered inside setupVite for development
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.platform === "win32" ? "localhost" : "0.0.0.0";

    httpServer.listen(port, host, () => {
      log(`Server running on http://${host}:${port}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err?.message || String(err));
    process.exit(1);
  }
})();