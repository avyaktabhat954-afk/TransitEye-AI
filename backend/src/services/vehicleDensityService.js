const crypto = require("crypto");
const defaultRepository = require("../repositories/vehicleDensityRepository");
const defaultSegmentMatcher = require("../repositories/roadSegmentRepository");

/**
 * Vehicle Density Service
 * Encapsulates domain logic, normalization, and defaults for traffic intelligence metrics.
 *
 * Task 4: Before persisting, attempts GPS → road segment matching via PostGIS
 * if segment_id is not already provided by the caller.
 */
class VehicleDensityService {
  constructor(
    repository = defaultRepository,
    segmentMatcher = defaultSegmentMatcher
  ) {
    this.repository = repository;
    this.segmentMatcher = segmentMatcher;
    this.maxMatchDistance = Number(
      process.env.SEGMENT_MATCH_RADIUS_METERS || 50
    );
  }

  async createVehicleDensity(payload) {
    const normalizedBreakdown = {};
    if (payload.class_breakdown && typeof payload.class_breakdown === "object") {
      for (const [k, v] of Object.entries(payload.class_breakdown)) {
        normalizedBreakdown[k] = Number(v);
      }
    }

    const normalized = {
      id: payload.id || `vd-${crypto.randomUUID()}`,
      segment_id: payload.segment_id || null,
      vehicle_count: Number(payload.vehicle_count),
      class_breakdown: normalizedBreakdown,
      bus_id: String(payload.bus_id).trim(),
      recorded_at: payload.recorded_at || new Date().toISOString(),
      location: payload.location
        ? {
            latitude: Number(payload.location.latitude),
            longitude: Number(payload.location.longitude),
            altitude:
              payload.location.altitude !== undefined && payload.location.altitude !== null
                ? Number(payload.location.altitude)
                : null,
            speed:
              payload.location.speed !== undefined && payload.location.speed !== null
                ? Number(payload.location.speed)
                : null,
            heading:
              payload.location.heading !== undefined && payload.location.heading !== null
                ? Number(payload.location.heading)
                : null,
            accuracy:
              payload.location.accuracy !== undefined && payload.location.accuracy !== null
                ? Number(payload.location.accuracy)
                : null,
          }
        : null,
      metadata: payload.metadata || {},
    };

    // GPS → Road Segment Matching (Task 4)
    // If segment_id was not provided and location is available, attempt spatial match
    if (!normalized.segment_id && normalized.location) {
      try {
        const match = await this.segmentMatcher.findNearest(
          normalized.location.longitude,
          normalized.location.latitude,
          this.maxMatchDistance
        );
        if (match) {
          normalized.segment_id = match.segment_id;
        }
      } catch (err) {
        // Best-effort: if spatial matching fails, proceed without segment_id
        console.warn(
          `[VehicleDensityService] Segment matching failed (best-effort): ${err.message}`
        );
      }
    }

    return await this.repository.create(normalized);
  }

  async getAllVehicleDensity(options = {}) {
    return await this.repository.findAll(options);
  }

  async getVehicleDensityById(id) {
    return await this.repository.findById(id);
  }
}

module.exports = new VehicleDensityService();
