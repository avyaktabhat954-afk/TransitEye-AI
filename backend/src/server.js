const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const detectionRoutes = require("./routes/detectionRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const vehicleDensityRoutes = require("./routes/vehicleDensityRoutes");
const { supabaseEnabled, checkSupabaseConnection } = require("./config/supabaseClient");

const app = express();

const PORT = process.env.BACKEND_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "TransitEye Backend",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/detections", detectionRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/vehicle-density", vehicleDensityRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Backend error:", err);
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: "Malformed JSON payload in request body",
    });
  }
  return res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`TransitEye backend running on http://localhost:${PORT}`);

  // Non-blocking Supabase connectivity check
  if (supabaseEnabled) {
    const result = await checkSupabaseConnection();
    if (result.connected) {
      console.log("[Supabase] Connection verified — database is reachable.");
    } else {
      console.warn(`[Supabase] Connection check failed: ${result.error}`);
    }
  } else {
    console.log("[Supabase] Not configured — using in-memory repositories.");
  }
});
