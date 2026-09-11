const crypto = require("crypto");
const defaultRepository = require("../repositories/vehicleDensityRepository");

/**
 * Vehicle Density Service
 * Encapsulates domain logic, normalization, and defaults for traffic intelligence metrics.
 */
class VehicleDensityService {
  constructor(repository = defaultRepository) {
    this.repository = repository;
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

    return await this.repository.create(normalized);
  }

  async getAllVehicleDensity() {
    return await this.repository.findAll();
  }

  async getVehicleDensityById(id) {
    return await this.repository.findById(id);
  }
}

module.exports = new VehicleDensityService();
