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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// Real AI Multi-Pipeline Inference Endpoint Proxy
app.post("/api/infer", async (req, res, next) => {
  try {
    const http = require("http");
    const payloadData = JSON.stringify(req.body || {});
    
    const options = {
      hostname: "localhost",
      port: 8000,
      path: "/infer",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payloadData)
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        try {
          const jsonRes = JSON.parse(data);
          return res.status(proxyRes.statusCode).json(jsonRes);
        } catch {
          return res.status(proxyRes.statusCode).send(data);
        }
      });
    });

    proxyReq.on("error", (err) => {
      console.warn("[Backend /api/infer] Edge Orchestrator on port 8000 unreachable:", err.message);
      return res.status(503).json({
        success: false,
        error: "Edge Orchestrator Service Unavailable",
        message: "Ensure Edge Orchestrator is running on port 8000."
      });
    });

    proxyReq.write(payloadData);
    proxyReq.end();
  } catch (err) {
    next(err);
  }
});

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
