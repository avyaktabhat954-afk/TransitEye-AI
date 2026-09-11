/**
 * Query Validation Middleware / Helpers
 *
 * Validates and sanitizes query parameters for:
 * - GET /api/detections
 * - GET /api/incidents
 * - GET /api/vehicle-density
 *
 * Ensures proper types, range limits (limit 1-200, offset >= 0),
 * ISO 8601 timestamps, and schema-supported enum values.
 */

const ALLOWED_DETECTION_TYPES = ["road_defect", "waterlogging", "vru_safety"];
const ALLOWED_DETECTION_STATUSES = [
  "pending",
  "confirmed",
  "in_review",
  "resolved",
  "rejected",
];
const ALLOWED_DETECTION_SEVERITIES = ["low", "medium", "high", "critical"];

function isValidISO8601(str) {
  if (typeof str !== "string" || !str.trim()) return false;
  const trimmed = str.trim();
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(
    trimmed
  );
}

function parsePagination(query, errors) {
  let limit = 50;
  let offset = 0;

  if (query.limit !== undefined) {
    const raw = String(query.limit).trim();
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || String(parsed) !== raw) {
      errors.push("Invalid 'limit': must be an integer between 1 and 200");
    } else if (parsed < 1 || parsed > 200) {
      errors.push("Invalid 'limit': must be between 1 and 200");
    } else {
      limit = parsed;
    }
  }

  if (query.offset !== undefined) {
    const raw = String(query.offset).trim();
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || String(parsed) !== raw) {
      errors.push("Invalid 'offset': must be an integer >= 0");
    } else if (parsed < 0) {
      errors.push("Invalid 'offset': must be >= 0");
    } else {
      offset = parsed;
    }
  }

  return { limit, offset };
}

function parseTimeRange(query, errors) {
  let since = null;
  let until = null;

  if (query.since !== undefined) {
    if (!isValidISO8601(query.since)) {
      errors.push("Invalid 'since': must be a valid ISO 8601 date string");
    } else {
      since = new Date(query.since).toISOString();
    }
  }

  if (query.until !== undefined) {
    if (!isValidISO8601(query.until)) {
      errors.push("Invalid 'until': must be a valid ISO 8601 date string");
    } else {
      until = new Date(query.until).toISOString();
    }
  }

  if (since && until && new Date(since) > new Date(until)) {
    errors.push("Invalid time range: 'since' must be earlier than or equal to 'until'");
  }

  return { since, until };
}

function validateDetectionQuery(query) {
  const errors = [];
  const { limit, offset } = parsePagination(query, errors);
  const { since, until } = parseTimeRange(query, errors);

  let type = null;
  if (query.type !== undefined) {
    if (!ALLOWED_DETECTION_TYPES.includes(query.type)) {
      errors.push(
        `Invalid 'type': '${query.type}'. Allowed values: [${ALLOWED_DETECTION_TYPES.join(", ")}]`
      );
    } else {
      type = query.type;
    }
  }

  let subtype = null;
  if (query.subtype !== undefined) {
    if (typeof query.subtype !== "string" || !query.subtype.trim()) {
      errors.push("Invalid 'subtype': must be a non-empty string");
    } else {
      subtype = query.subtype.trim();
    }
  }

  let status = null;
  if (query.status !== undefined) {
    if (!ALLOWED_DETECTION_STATUSES.includes(query.status)) {
      errors.push(
        `Invalid 'status': '${query.status}'. Allowed values: [${ALLOWED_DETECTION_STATUSES.join(", ")}]`
      );
    } else {
      status = query.status;
    }
  }

  let severity = null;
  if (query.severity !== undefined) {
    if (!ALLOWED_DETECTION_SEVERITIES.includes(query.severity)) {
      errors.push(
        `Invalid 'severity': '${query.severity}'. Allowed values: [${ALLOWED_DETECTION_SEVERITIES.join(", ")}]`
      );
    } else {
      severity = query.severity;
    }
  }

  let segment_id = null;
  if (query.segment_id !== undefined) {
    if (typeof query.segment_id !== "string" || !query.segment_id.trim()) {
      errors.push("Invalid 'segment_id': must be a non-empty string");
    } else {
      segment_id = query.segment_id.trim();
    }
  }

  return {
    errors,
    options: {
      type,
      subtype,
      status,
      severity,
      segment_id,
      since,
      until,
      limit,
      offset,
    },
  };
}

function validateIncidentQuery(query) {
  const errors = [];
  const { limit, offset } = parsePagination(query, errors);
  const { since, until } = parseTimeRange(query, errors);

  let bus_id = null;
  if (query.bus_id !== undefined) {
    if (typeof query.bus_id !== "string" || !query.bus_id.trim()) {
      errors.push("Invalid 'bus_id': must be a non-empty string");
    } else {
      bus_id = query.bus_id.trim();
    }
  }

  let trigger_reason = null;
  if (query.trigger_reason !== undefined) {
    if (typeof query.trigger_reason !== "string" || !query.trigger_reason.trim()) {
      errors.push("Invalid 'trigger_reason': must be a non-empty string");
    } else {
      trigger_reason = query.trigger_reason.trim();
    }
  }

  return {
    errors,
    options: {
      bus_id,
      trigger_reason,
      since,
      until,
      limit,
      offset,
    },
  };
}

function validateVehicleDensityQuery(query) {
  const errors = [];
  const { limit, offset } = parsePagination(query, errors);
  const { since, until } = parseTimeRange(query, errors);

  let segment_id = null;
  if (query.segment_id !== undefined) {
    if (typeof query.segment_id !== "string" || !query.segment_id.trim()) {
      errors.push("Invalid 'segment_id': must be a non-empty string");
    } else {
      segment_id = query.segment_id.trim();
    }
  }

  return {
    errors,
    options: {
      segment_id,
      since,
      until,
      limit,
      offset,
    },
  };
}

module.exports = {
  validateDetectionQuery,
  validateIncidentQuery,
  validateVehicleDensityQuery,
  ALLOWED_DETECTION_TYPES,
  ALLOWED_DETECTION_STATUSES,
  ALLOWED_DETECTION_SEVERITIES,
};
