/**
 * Validation Middleware for POST /api/detections
 * Grounded in shared/schemas/detection.schema.json & common.schema.json.
 */

const ALLOWED_TYPES = ["road_defect", "waterlogging", "vru_safety"];
const ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"];
const ALLOWED_STATUSES = ["pending", "confirmed", "in_review", "resolved", "rejected"];

function validateDetection(req, res, next) {
  const data = req.body;
  const errors = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body: expected a JSON object",
    });
  }

  // Required: type
  if (!data.type) {
    errors.push("Missing required field: 'type'");
  } else if (!ALLOWED_TYPES.includes(data.type)) {
    errors.push(
      `Invalid 'type': '${data.type}'. Allowed values: [${ALLOWED_TYPES.join(", ")}]`
    );
  }

  // Required: subtype
  if (!data.subtype || typeof data.subtype !== "string" || data.subtype.trim() === "") {
    errors.push("Missing or invalid required field: 'subtype' (must be a non-empty string)");
  }

  // Required: confidence
  if (data.confidence === undefined || data.confidence === null) {
    errors.push("Missing required field: 'confidence'");
  } else {
    const conf = Number(data.confidence);
    if (isNaN(conf) || conf < 0.0 || conf > 1.0) {
      errors.push("Invalid 'confidence': must be a number between 0.0 and 1.0");
    }
  }

  // Required: severity
  if (!data.severity) {
    errors.push("Missing required field: 'severity'");
  } else if (!ALLOWED_SEVERITIES.includes(data.severity)) {
    errors.push(
      `Invalid 'severity': '${data.severity}'. Allowed values: [${ALLOWED_SEVERITIES.join(", ")}]`
    );
  }

  // Required: location
  if (!data.location || typeof data.location !== "object" || Array.isArray(data.location)) {
    errors.push("Missing or invalid required field: 'location' (must be an object)");
  } else {
    const { latitude, longitude } = data.location;
    if (latitude === undefined || latitude === null || isNaN(Number(latitude))) {
      errors.push("Invalid 'location.latitude': must be a valid number");
    } else {
      const lat = Number(latitude);
      if (lat < -90 || lat > 90) {
        errors.push("Invalid 'location.latitude': must be between -90 and 90");
      }
    }

    if (longitude === undefined || longitude === null || isNaN(Number(longitude))) {
      errors.push("Invalid 'location.longitude': must be a valid number");
    } else {
      const lon = Number(longitude);
      if (lon < -180 || lon > 180) {
        errors.push("Invalid 'location.longitude': must be between -180 and 180");
      }
    }
  }

  // Required: bus_id
  if (!data.bus_id || typeof data.bus_id !== "string" || data.bus_id.trim() === "") {
    errors.push("Missing or invalid required field: 'bus_id' (must be a non-empty string)");
  }

  // Optional: status
  if (data.status && !ALLOWED_STATUSES.includes(data.status)) {
    errors.push(
      `Invalid 'status': '${data.status}'. Allowed values: [${ALLOWED_STATUSES.join(", ")}]`
    );
  }

  // Optional: confirmed_by_count
  if (data.confirmed_by_count !== undefined && data.confirmed_by_count !== null) {
    const count = Number(data.confirmed_by_count);
    if (!Number.isInteger(count) || count < 1) {
      errors.push("Invalid 'confirmed_by_count': must be an integer >= 1");
    }
  }

  // Optional: timestamp
  if (data.timestamp) {
    const parsed = Date.parse(data.timestamp);
    if (isNaN(parsed)) {
      errors.push("Invalid 'timestamp': must be a valid ISO 8601 date-time string");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Detection payload validation failed",
      details: errors,
    });
  }

  next();
}

module.exports = validateDetection;
