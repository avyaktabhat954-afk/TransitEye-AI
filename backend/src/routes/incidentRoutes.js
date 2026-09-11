const express = require("express");
const router = express.Router();
const incidentController = require("../controllers/incidentController");
const validateIncident = require("../middleware/validateIncident");

// Ingestion and retrieval routes for incidents / ANPR
router.post("/", validateIncident, incidentController.createIncident);
router.get("/", incidentController.getIncidents);

module.exports = router;
