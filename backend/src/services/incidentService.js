const crypto = require("crypto");
const defaultRepository = require("../repositories/incidentRepository");

/**
 * Incident Service
 * Encapsulates domain logic, normalization, and defaults for incidents / ANPR records.
 */
class IncidentService {
  constructor(repository = defaultRepository) {
    this.repository = repository;
  }

  async createIncident(payload) {
    const normalized = {
      id: payload.id || `inc-${crypto.randomUUID()}`,
      plate_text: String(payload.plate_text).trim().toUpperCase(),
      plate_confidence: Number(payload.plate_confidence),
      trigger_reason: String(payload.trigger_reason).trim(),
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
      clip_url: payload.clip_url || null,
      bus_id: String(payload.bus_id).trim(),
      timestamp: payload.timestamp || new Date().toISOString(),
      metadata: payload.metadata || {},
    };

    return await this.repository.create(normalized);
  }

  async getAllIncidents() {
    return await this.repository.findAll();
  }

  async getIncidentById(id) {
    return await this.repository.findById(id);
  }
}

module.exports = new IncidentService();
