const express = require("express");
const router = express.Router();
const detectionController = require("../controllers/detectionController");
const validateDetection = require("../middleware/validateDetection");

// Ingestion and retrieval routes for detections
router.post("/", validateDetection, detectionController.createDetection);
router.get("/", detectionController.getDetections);

module.exports = router;
