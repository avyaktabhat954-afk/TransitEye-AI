-- ==========================================================
-- Migration 009: Multi-Bus Consensus RPC Function
-- TransitEye — Phase 1 Task 5
-- ==========================================================
-- Finds an existing active detection candidate for corroboration
-- based on:
--   1. Identical type and subtype
--   2. Active status ('pending' or 'confirmed')
--   3. Temporal recency within p_window_hours
--   4. Spatial proximity: identical road segment OR PostGIS
--      geography distance <= p_max_distance_meters
-- ==========================================================

CREATE OR REPLACE FUNCTION find_consensus_detection(
  p_type TEXT,
  p_subtype TEXT,
  p_segment_id TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lon DOUBLE PRECISION DEFAULT NULL,
  p_window_hours DOUBLE PRECISION DEFAULT 24.0,
  p_max_distance_meters DOUBLE PRECISION DEFAULT 30.0
)
RETURNS SETOF detections AS $$
BEGIN
  RETURN QUERY
  SELECT d.*
  FROM detections d
  WHERE
    d.type = p_type
    AND d.subtype = p_subtype
    AND d.status IN ('pending', 'confirmed')
    AND d.timestamp >= (NOW() - (p_window_hours || ' hours')::interval)
    AND (
      (p_segment_id IS NOT NULL AND d.segment_id = p_segment_id)
      OR
      (
        p_lat IS NOT NULL
        AND p_lon IS NOT NULL
        AND d.geom IS NOT NULL
        AND ST_DWithin(
          d.geom::geography,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
          p_max_distance_meters
        )
      )
    )
  ORDER BY
    CASE
      WHEN p_lat IS NOT NULL AND p_lon IS NOT NULL AND d.geom IS NOT NULL THEN
        ST_Distance(
          d.geom::geography,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
        )
      ELSE 0.0
    END ASC,
    d.timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
