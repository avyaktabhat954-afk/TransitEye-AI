-- ==========================================================
-- Migration 008: GPS → Road Segment Matching RPC Function
-- TransitEye — Phase 1 Task 4
-- ==========================================================
-- Creates a PostgreSQL function callable via supabase.rpc()
-- that finds the nearest road_segment to a given GPS point
-- within a configurable distance threshold (meters).
--
-- Spatial logic:
--   ST_DWithin(geography, geography, meters) — indexed pre-filter
--   ST_Distance(geography, geography) — exact geodetic distance
--   ::geography cast ensures meter-based calculations
--
-- Usage from supabase-js:
--   supabase.rpc('match_nearest_segment', {
--     p_lon: 77.209,
--     p_lat: 28.6139,
--     p_max_distance_meters: 50
--   })
--
-- Returns: { segment_id, segment_name, distance_meters }
--          or empty result set if no segment within threshold.
--
-- Idempotent: uses CREATE OR REPLACE.
-- ==========================================================

CREATE OR REPLACE FUNCTION match_nearest_segment(
  p_lon DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_max_distance_meters DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE(segment_id TEXT, segment_name TEXT, distance_meters DOUBLE PRECISION)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rs.id AS segment_id,
    rs.name AS segment_name,
    ST_Distance(
      rs.geom::geography,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    ) AS distance_meters
  FROM road_segments rs
  WHERE ST_DWithin(
    rs.geom::geography,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_max_distance_meters
  )
  ORDER BY distance_meters ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
