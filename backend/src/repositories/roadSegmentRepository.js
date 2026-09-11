/**
 * Road Segment Repository
 *
 * Provides spatial queries against the road_segments table via PostGIS.
 * Used by services to perform GPS → road segment matching (Task 4).
 *
 * Production/application runtime strictly requires Supabase/PostGIS.
 * In-memory stub is retained for explicit test usage only.
 *
 * This repository is READ-ONLY — it does not create, update, or delete
 * road segments. Segment data is managed via SQL migrations.
 */

const { supabase, supabaseEnabled } = require("../config/supabaseClient");

class InMemoryRoadSegmentRepository {
  constructor() {
    this.segments = [];
  }

  async findNearest(longitude, latitude, maxDistanceMeters) {
    // In-memory stub: no spatial matching capability
    return null;
  }

  async findAll() {
    return this.segments.map((s) => ({ ...s }));
  }
}

class SupabaseRoadSegmentRepository {
  constructor(client = supabase) {
    if (!client) {
      throw new Error(
        "[TransitEye Configuration Error] Supabase is required for application runtime, " +
          "but the Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_SECRET_KEY in .env. " +
          "Silent in-memory fallback is disabled in application mode."
      );
    }
    this.client = client;
  }

  /**
   * Find the nearest road segment to a GPS point within a distance threshold.
   *
   * @param {number} longitude - GPS longitude (WGS84)
   * @param {number} latitude  - GPS latitude (WGS84)
   * @param {number} maxDistanceMeters - Maximum search radius in meters (default: 50)
   * @returns {Promise<{segment_id: string, segment_name: string, distance_meters: number} | null>}
   */
  async findNearest(longitude, latitude, maxDistanceMeters = 50) {
    const { data, error } = await this.client.rpc("match_nearest_segment", {
      p_lon: longitude,
      p_lat: latitude,
      p_max_distance_meters: maxDistanceMeters,
    });

    if (error) {
      throw new Error(
        `[RoadSegmentRepository.findNearest] RPC failed: ${error.message} (code: ${error.code})`
      );
    }

    // RPC returns an array; take the first (closest) result
    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  /**
   * Retrieve all road segments (for diagnostics/testing).
   * @returns {Promise<Array>}
   */
  async findAll() {
    const { data, error } = await this.client
      .from("road_segments")
      .select("id, name, ward, city")
      .order("id");

    if (error) {
      throw new Error(
        `[RoadSegmentRepository.findAll] Failed: ${error.message} (code: ${error.code})`
      );
    }

    return data || [];
  }
}

// Select repository: In-memory only if explicitly requested via USE_IN_MEMORY_REPO=true
let repositoryInstance;
if (process.env.USE_IN_MEMORY_REPO === "true") {
  repositoryInstance = new InMemoryRoadSegmentRepository();
} else {
  repositoryInstance = new SupabaseRoadSegmentRepository();
}

module.exports = repositoryInstance;
module.exports.SupabaseRoadSegmentRepository = SupabaseRoadSegmentRepository;
module.exports.InMemoryRoadSegmentRepository = InMemoryRoadSegmentRepository;
