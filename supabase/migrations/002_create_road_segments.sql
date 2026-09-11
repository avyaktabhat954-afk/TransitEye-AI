-- ==========================================================
-- Migration 002: Create road_segments table
-- TransitEye — Phase 1 Task 2
-- ==========================================================
-- road_segments is a backend/PostGIS-only table with no
-- counterpart in the shared JSON schemas. It provides the
-- geospatial reference for GPS→segment matching (Task 4).
--
-- The segment_id field in detections and vehicle_density
-- schemas references this table.
--
-- Idempotent: uses IF NOT EXISTS.
-- ==========================================================

CREATE TABLE IF NOT EXISTS road_segments (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  geom        GEOMETRY(LineString, 4326) NOT NULL,
  ward        TEXT,
  city        TEXT DEFAULT 'Delhi',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_road_segments_geom
  ON road_segments USING GIST (geom);
