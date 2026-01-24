// Minimal routes.js for testing
export async function registerRoutes(httpServer, app) {
  // Health check endpoint for Railway
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  });

  // API status endpoint
  app.get("/api/status", (req, res) => {
    res.json({ 
      message: "SwasthyaTrack API is running",
      timestamp: new Date().toISOString(),
      status: "healthy"
    });
  });

  console.log("Routes registered successfully");
}