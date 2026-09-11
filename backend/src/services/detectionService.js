const crypto = require("crypto");
const defaultRepository = require("../repositories/detectionRepository");
const defaultSegmentMatcher = require("../repositories/roadSegmentRepository");

/**
 * Detection Service
 * Encapsulates domain logic, normalization, and defaults for detection observations.
 *
 * Task 4: Before persisting, attempts GPS → road segment matching via PostGIS
 * if segment_id is not already provided by the caller.
 *
 * Task 5: Multi-Bus Consensus & Corroboration Engine.
 * Checks for existing active detections of the same type/subtype within spatial
 * and temporal proximity. If corroborated by a confirming bus/pass, increments
 * confirmation count, elevates status to 'confirmed', and updates confidence.
 */
class DetectionService {
  constructor(
    repository = defaultRepository,
    segmentMatcher = defaultSegmentMatcher
  ) {
    this.repository = repository;
    this.segmentMatcher = segmentMatcher;
    this.maxMatchDistance = Number(
      process.env.SEGMENT_MATCH_RADIUS_METERS || 50
    );
    this.consensusWindowHours = Number(
      process.env.CONSENSUS_WINDOW_HOURS || 24
    );
    this.consensusMinConfirmations = Number(
      process.env.CONSENSUS_MIN_CONFIRMATIONS || 2
    );
    this.consensusMaxDistance = Number(
      process.env.CONSENSUS_MAX_DISTANCE_METERS || 30
    );
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

    // Step 1: GPS → Road Segment Matching (Task 4)
    // If segment_id was not provided, attempt spatial match via PostGIS
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
          `[DetectionService] Segment matching failed (best-effort): ${err.message}`
        );
      }
    }

    // Step 2: Multi-Bus Consensus & Corroboration Engine (Task 5)
    // Search for an active matching candidate on the same segment or within proximity
    try {
      const candidate = await this.repository.findConsensusCandidate({
        type: normalized.type,
        subtype: normalized.subtype,
        segment_id: normalized.segment_id,
        latitude: normalized.location?.latitude,
        longitude: normalized.location?.longitude,
        windowHours: this.consensusWindowHours,
        maxDistanceMeters: this.consensusMaxDistance,
      });

      if (candidate) {
        const existingBuses = Array.isArray(candidate.metadata?.confirming_buses)
          ? candidate.metadata.confirming_buses
          : [candidate.bus_id];

        const isNewBus = !existingBuses.includes(normalized.bus_id);
        const timeDiffMinutes =
          Math.abs(new Date(normalized.timestamp) - new Date(candidate.timestamp)) / 60000;

        // An observation counts as a corroborating pass if:
        // 1. It is submitted by a different bus, OR
        // 2. It is from the same bus after at least 5 minutes (distinct route pass, avoids frame duplicates)
        const countsAsConfirmation = isNewBus || timeDiffMinutes >= 5;

        const newConfirmedCount = countsAsConfirmation
          ? candidate.confirmed_by_count + 1
          : candidate.confirmed_by_count;

        const newStatus =
          newConfirmedCount >= this.consensusMinConfirmations
            ? "confirmed"
            : candidate.status;

        // Boosted confidence reflecting corroboration from multiple sensors/passes
        const boostedConfidence = Math.min(
          1.0,
          Math.round(
            (Math.max(candidate.confidence, normalized.confidence) + (countsAsConfirmation ? 0.05 : 0)) * 100
          ) / 100
        );

        const updatedMetadata = {
          ...(candidate.metadata || {}),
          confirming_buses: Array.from(new Set([...existingBuses, normalized.bus_id])),
          last_confirmed_at: normalized.timestamp,
          last_confirming_bus: normalized.bus_id,
          corroborated: true,
        };

        const updatedThumbnail = candidate.thumbnail_url || normalized.thumbnail_url;

        const updates = {
          confirmed_by_count: newConfirmedCount,
          status: newStatus,
          confidence: boostedConfidence,
          thumbnail_url: updatedThumbnail,
          metadata: updatedMetadata,
        };

        return await this.repository.update(candidate.id, updates);
      }
    } catch (err) {
      // Best-effort: if consensus check fails, log warning and proceed to create new record
      console.warn(
        `[DetectionService] Consensus matching failed (best-effort): ${err.message}`
      );
    }

    // Step 3: No matching candidate found — persist as new master detection
    normalized.metadata = {
      ...(normalized.metadata || {}),
      confirming_buses: [normalized.bus_id],
    };

    return await this.repository.create(normalized);
  }

  async getAllDetections(options = {}) {
    return await this.repository.findAll(options);
  }

  async getDetectionById(id) {
    return await this.repository.findById(id);
  }
}

module.exports = new DetectionService();
