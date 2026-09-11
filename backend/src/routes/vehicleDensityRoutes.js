const express = require("express");
const router = express.Router();
const vehicleDensityController = require("../controllers/vehicleDensityController");
const validateVehicleDensity = require("../middleware/validateVehicleDensity");

// Ingestion and retrieval routes for vehicle density
router.post("/", validateVehicleDensity, vehicleDensityController.createVehicleDensity);
router.get("/", vehicleDensityController.getVehicleDensity);

module.exports = router;
