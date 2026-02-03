// server/index.ts
import 'dotenv/config';
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { db } from "./db.js"; // your DB connection
import authRoutes from "./auth.js"; // authentication routes

// --- Setup Express ---
const app = express();
const httpServer = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// CORS configuration - allow all origins temporarily for mobile data issues
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// --- Healthcheck for Railway ---
app.get("/", (_req, res) => res.send("OK"));

// --- Auth routes ---
app.use("/api/auth", authRoutes);

// --- Logger ---
function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${time} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJson: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJson = bodyJson;
    return originalJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJson) {
        try {
          const jsonStr = JSON.stringify(capturedJson);
          logLine += jsonStr.length > 1000 ? ` :: ${jsonStr.substring(0, 1000)}... (truncated)` : ` :: ${jsonStr}`;
        } catch { logLine += ` :: [Response too large]`; }
      }
      log(logLine);
    }
  });
  next();
});

// --- Error Handler ---
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  res.status(status).json({ message });
  log(`Error: ${message}`, "error");
});

// --- Global Error Handlers ---
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason) || 'Unhandled Promise Rejection';
  if (!msg.includes('DbHandler')) console.error('Unhandled Rejection:', msg);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  const msg = error?.message || String(error) || 'Uncaught Exception';
  if (!msg.includes('DbHandler')) console.error('Uncaught Exception:', msg);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Export app for testing
export { app };

// --- Main Async Bootstrap ---
(async () => {
  try {
    // Test DB connection
    try {
      await db.execute("SELECT 1");
      log("Database connection successful");
    } catch (dbErr: any) {
      console.error("Database connection failed:", dbErr?.message || String(dbErr));
      process.exit(1);
    }

    // --- Mount all API routes ---
    let registerRoutes: typeof import("./routes.js").registerRoutes;
    if (process.env.NODE_ENV === "production") {
      // Load compiled JS in production (routes.js will be in same directory as index.js)
      registerRoutes = (await import("./routes.js")).registerRoutes;
    } else {
      // Load TS directly in development
      registerRoutes = (await import("./routes.js")).registerRoutes;
    }
    await registerRoutes(httpServer, app);

    // --- Serve frontend SPA ---
    if (process.env.NODE_ENV === "production") {
      const clientDist = path.join(__dirname, "..", "client");
      app.use(express.static(clientDist));

      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) return res.status(404).json({ message: 'API route not found' });
        res.sendFile(path.join(clientDist, "index.html"));
      });
    } else {
      // Development with Vite
      const { setupVite } = await import("./vite.js");
      await setupVite(httpServer, app);
    }

    // --- Listen ---
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.platform === "win32" ? "localhost" : "0.0.0.0";
    httpServer.listen(port, host, () => log(`Server running on http://${host}:${port}`));

  } catch (err: any) {
    console.error("Failed to start server:", err?.message || String(err));
    process.exit(1);
  }
})();
