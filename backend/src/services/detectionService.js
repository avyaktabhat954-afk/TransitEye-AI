const crypto = require("crypto");
const defaultRepository = require("../repositories/detectionRepository");

/**
 * Detection Service
 * Encapsulates domain logic, normalization, and defaults for detection observations.
 */
class DetectionService {
  constructor(repository = defaultRepository) {
    this.repository = repository;
  }

  async createDetection(payload) {
    const normalized = {
      id: payload.id || `det-${crypto.randomUUID()}`,
      type: payload.type,
      subtype: payload.subtype,
      confidence: Number(payload.confidence),
      severity: payload.severity,
      location: {
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
      },
      segment_id: payload.segment_id || null,
      status: payload.status || "pending",
      confirmed_by_count:
        payload.confirmed_by_count !== undefined ? Number(payload.confirmed_by_count) : 1,
      bus_id: payload.bus_id,
      timestamp: payload.timestamp || new Date().toISOString(),
      thumbnail_url: payload.thumbnail_url || null,
      metadata: payload.metadata || {},
    };

    return await this.repository.create(normalized);
  }

  async getAllDetections() {
    return await this.repository.findAll();
  }

  async getDetectionById(id) {
    return await this.repository.findById(id);
  }
}

module.exports = new DetectionService();
