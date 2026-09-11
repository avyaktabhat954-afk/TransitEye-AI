-- ==========================================================
-- Migration 005: Create vehicle_density table
-- TransitEye — Phase 1 Task 2
-- ==========================================================
-- Mirrors shared/schemas/vehicle_density.schema.json exactly.
--
-- DUAL LOCATION STORAGE:
--   location (JSONB) — preserves exact API contract shape
--   geom (GEOMETRY)  — enables PostGIS spatial queries
--
-- Note: location is nullable in this table (not required
-- by the shared schema).
--
-- Idempotent: uses IF NOT EXISTS.
-- ==========================================================

CREATE TABLE IF NOT EXISTS vehicle_density (
  id              TEXT PRIMARY KEY,
  segment_id      TEXT REFERENCES road_segments(id),
  vehicle_count   INTEGER NOT NULL
                    CHECK (vehicle_count >= 0),
  class_breakdown JSONB NOT NULL,
  bus_id          TEXT NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL,
  location        JSONB,
  geom            GEOMETRY(Point, 4326),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vd_segment
  ON vehicle_density (segment_id);

CREATE INDEX IF NOT EXISTS idx_vd_recorded_at
  ON vehicle_density (recorded_at);

CREATE INDEX IF NOT EXISTS idx_vd_geom
  ON vehicle_density USING GIST (geom);
