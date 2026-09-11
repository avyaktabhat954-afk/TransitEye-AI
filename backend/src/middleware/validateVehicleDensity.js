/**
 * Validation Middleware for POST /api/vehicle-density
 * Grounded in shared/schemas/vehicle_density.schema.json & common.schema.json.
 */

function validateVehicleDensity(req, res, next) {
  const data = req.body;
  const errors = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: "Invalid request body: expected a JSON object",
    });
  }

  // Required: vehicle_count
  if (data.vehicle_count === undefined || data.vehicle_count === null) {
    errors.push("Missing required field: 'vehicle_count'");
  } else {
    const count = Number(data.vehicle_count);
    if (!Number.isInteger(count) || count < 0) {
      errors.push("Invalid 'vehicle_count': must be an integer >= 0");
    }
  }

  // Required: class_breakdown
  if (!data.class_breakdown || typeof data.class_breakdown !== "object" || Array.isArray(data.class_breakdown)) {
    errors.push("Missing or invalid required field: 'class_breakdown' (must be an object)");
  } else {
    for (const [cls, count] of Object.entries(data.class_breakdown)) {
      const num = Number(count);
      if (!Number.isInteger(num) || num < 0) {
        errors.push(
          `Invalid count for vehicle class '${cls}': must be an integer >= 0`
        );
      }
    }
  }

  // Required: bus_id
  if (!data.bus_id || typeof data.bus_id !== "string" || data.bus_id.trim() === "") {
    errors.push("Missing or invalid required field: 'bus_id' (must be a non-empty string)");
  }

  // Optional: recorded_at
  if (data.recorded_at) {
    const parsed = Date.parse(data.recorded_at);
    if (isNaN(parsed)) {
      errors.push("Invalid 'recorded_at': must be a valid ISO 8601 date-time string");
    }
  }

  // Optional: location
  if (data.location !== undefined && data.location !== null) {
    if (typeof data.location !== "object" || Array.isArray(data.location)) {
      errors.push("Invalid 'location': must be an object");
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
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Vehicle density payload validation failed",
      details: errors,
    });
  }

  next();
}

module.exports = validateVehicleDensity;
