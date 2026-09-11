/**
 * TransitEye API Service Layer & Adapter (Stage A Finalized Backend Alignment)
 * Consumes team backend contracts via relative URLs proxied through Vite.
 *
 * Finalized Backend Endpoints (origin/backend-db):
 * - GET /api/detections (filters: type, subtype, status, severity, segment_id, since, until, limit [1-200, default 50], offset)
 * - GET /api/incidents (filters: bus_id, trigger_reason, since, until, limit [1-200, default 50], offset)
 * - GET /api/vehicle-density (filters: segment_id, since, until, limit [1-200, default 50], offset)
 * - GET /api/health
 *
 * Default Strategy:
 * Requests default to limit=200 to retrieve the complete active dataset for operational dashboard display.
 */

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
        if (Array.isArray(errorData.details) && errorData.details.length > 0) {
          errorMessage += `: ${errorData.details.join(", ")}`;
        }
      }
    } catch {
      // Non-JSON error payload fallback
    }
    throw new Error(errorMessage);
  }

  try {
    const payload = await response.json();
    return payload;
  } catch {
    throw new Error("Invalid JSON response payload received from server");
  }
}

/**
 * Builds a URLSearchParams string from an options object, filtering out null/undefined/empty values.
 * @param {Object} options 
 * @param {Array<string>} allowedKeys 
 * @param {number} defaultLimit 
 * @returns {string} Formatted query string (e.g. "?limit=200&severity=critical")
 */
function buildQueryString(options = {}, allowedKeys = [], defaultLimit = 200) {
  const params = new URLSearchParams();

  // Set default limit if not provided or invalid
  const limit = options.limit !== undefined && options.limit !== null ? options.limit : defaultLimit;
  if (limit !== null && limit !== undefined && limit !== "") {
    params.set("limit", String(limit));
  }

  for (const key of allowedKeys) {
    if (key === "limit") continue;
    const value = options[key];
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

/**
 * Fetch physical road observations (road_defect, waterlogging, vru_safety).
 * Backend contract: GET /api/detections
 * @param {Object} [options] Filter options (type, subtype, status, severity, segment_id, since, until, limit, offset)
 * @returns {Promise<{ success: boolean, count: number, data: Array, pagination?: Object }>}
 */
export async function getDetections(options = {}) {
  const allowedKeys = ["type", "subtype", "status", "severity", "segment_id", "since", "until", "limit", "offset"];
  const query = buildQueryString(options, allowedKeys, 200);
  const response = await fetch(`/api/detections${query}`);
  const payload = await handleResponse(response);
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw new Error("Unexpected response structure from /api/detections");
  }
  return payload;
}

/**
 * Fetch ANPR and traffic violation records.
 * Backend contract: GET /api/incidents
 * @param {Object} [options] Filter options (bus_id, trigger_reason, since, until, limit, offset)
 * @returns {Promise<{ success: boolean, count: number, data: Array, pagination?: Object }>}
 */
export async function getIncidents(options = {}) {
  const allowedKeys = ["bus_id", "trigger_reason", "since", "until", "limit", "offset"];
  const query = buildQueryString(options, allowedKeys, 200);
  const response = await fetch(`/api/incidents${query}`);
  const payload = await handleResponse(response);
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw new Error("Unexpected response structure from /api/incidents");
  }
  return payload;
}

/**
 * Fetch traffic flow and vehicle density metrics.
 * Backend contract: GET /api/vehicle-density
 * @param {Object} [options] Filter options (segment_id, since, until, limit, offset)
 * @returns {Promise<{ success: boolean, count: number, data: Array, pagination?: Object }>}
 */
export async function getVehicleDensity(options = {}) {
  const allowedKeys = ["segment_id", "since", "until", "limit", "offset"];
  const query = buildQueryString(options, allowedKeys, 200);
  const response = await fetch(`/api/vehicle-density${query}`);
  const payload = await handleResponse(response);
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    throw new Error("Unexpected response structure from /api/vehicle-density");
  }
  return payload;
}

/**
 * Check backend service health status.
 * Backend contract: GET /api/health
 * @returns {Promise<{ success: boolean, service: string, status: string, timestamp: string }>}
 */
export async function getHealth() {
  const response = await fetch("/api/health");
  return await handleResponse(response);
}

/**
 * Run real multi-model perception inference via Edge Orchestrator.
 * Contract: POST /api/infer
 * @param {Object} payload { image_b64, image_path, models }
 * @returns {Promise<{ success: boolean, statuses: Object, pipeline_results: Object, overlays: Array }>}
 */
export async function runInference(payload) {
  const response = await fetch("/api/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await handleResponse(response);
}

