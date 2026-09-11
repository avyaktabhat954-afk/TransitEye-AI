/**
 * Validation Middleware for POST /api/incidents
 * Grounded in shared/schemas/incident.schema.json & common.schema.json.
 */

function validateIncident(req, res, next) {
  const data = req.body;
  const errors = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body: expected a JSON object",
    });
  }

  // Required: plate_text
  if (!data.plate_text || typeof data.plate_text !== "string" || data.plate_text.trim() === "") {
    errors.push("Missing or invalid required field: 'plate_text' (must be a non-empty string)");
  }

  // Required: plate_confidence
  if (data.plate_confidence === undefined || data.plate_confidence === null) {
    errors.push("Missing required field: 'plate_confidence'");
  } else {
    const conf = Number(data.plate_confidence);
    if (isNaN(conf) || conf < 0.0 || conf > 1.0) {
      errors.push("Invalid 'plate_confidence': must be a number between 0.0 and 1.0");
    }
  }

  // Required: trigger_reason
  if (
    !data.trigger_reason ||
    typeof data.trigger_reason !== "string" ||
    data.trigger_reason.trim() === ""
  ) {
    errors.push(
      "Missing or invalid required field: 'trigger_reason' (must be a non-empty string)"
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

  // Optional: timestamp
  if (data.timestamp) {
    const parsed = Date.parse(data.timestamp);
    if (isNaN(parsed)) {
      errors.push("Invalid 'timestamp': must be a valid ISO 8601 date-time string");
    }
  }

  // Optional: clip_url
  if (data.clip_url !== undefined && data.clip_url !== null && typeof data.clip_url !== "string") {
    errors.push("Invalid 'clip_url': must be a string or null");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Incident payload validation failed",
      details: errors,
    });
  }

  next();
}

module.exports = validateIncident;
