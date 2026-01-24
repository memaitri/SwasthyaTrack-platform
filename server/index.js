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
  if (errorMessage && !errorMessage.includes('DbHandler')) {
    console.error('Unhandled Rejection:', errorMessage);
  }
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  const errorMessage = error?.message || String(error) || 'Uncaught Exception';
  if (errorMessage && !errorMessage.includes('DbHandler')) {
    console.error('Uncaught Exception:', errorMessage);
  }
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

// Healthcheck route for Railway (must be BEFORE anything heavy)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Auth routes
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
        try {
          const jsonStr = JSON.stringify(capturedJsonResponse);
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

// START SERVER FIRST (Railway healthcheck depends on this)
const port = Number(process.env.PORT) || 3000;

httpServer.listen(port, "0.0.0.0", () => {
  log(`Server live on port ${port}`);
});

// Async bootstrap AFTER server is listening
(async () => {
  try {
    // Test database connection
    try {
      await db.execute("SELECT 1");
      log("Database connection successful");

      // Fixup for approval workflow
      try {
        await db.execute("UPDATE schools SET approval_status = 'Approved' WHERE is_active = true");
        log("Migration check: existing active schools marked as Approved where necessary");
      } catch (uqErr) {
        console.warn("Migration check: failed to adjust existing school approval statuses:", uqErr?.message || String(uqErr));
      }

      // DB compatibility migrations
      try {
        await db.execute(`
DO $$
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
END $$;
        `);
        log("DB compatibility: ensured pran_no columns exist and migrated from mcts_no when present");
      } catch (compatErr) {
        console.warn("DB compatibility migration failed:", compatErr?.message || String(compatErr));
      }

    } catch (dbError) {
      console.error("Database connection failed:", dbError?.message || String(dbError));
      console.error("Please check your DATABASE_URL and database availability");
    }

    // Serve frontend
    if (process.env.NODE_ENV === "production") {
      await registerRoutes(httpServer, app);

      const clientDist = path.join(__dirname, "../../dist");
      app.use(express.static(clientDist));

      app.get("*", (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ message: 'API route not found' });
        }
        res.sendFile(path.join(clientDist, "index.html"));
      });
    } else {
      const { setupVite } = await import("./vite.js");
      await setupVite(httpServer, app);
    }

  } catch (err) {
    console.error("Startup failed:", err?.message || String(err));
  }
})();
