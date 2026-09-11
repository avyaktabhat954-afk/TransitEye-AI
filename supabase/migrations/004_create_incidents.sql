-- ==========================================================
-- Migration 004: Create incidents table
-- TransitEye — Phase 1 Task 2
-- ==========================================================
-- Mirrors shared/schemas/incident.schema.json exactly.
--
-- DUAL LOCATION STORAGE:
--   location (JSONB) — preserves exact API contract shape
--   geom (GEOMETRY)  — enables PostGIS spatial queries
--
-- Idempotent: uses IF NOT EXISTS.
-- ==========================================================

CREATE TABLE IF NOT EXISTS incidents (
  id                TEXT PRIMARY KEY,
  plate_text        TEXT NOT NULL,
  plate_confidence  REAL NOT NULL
                      CHECK (plate_confidence >= 0 AND plate_confidence <= 1),
  trigger_reason    TEXT NOT NULL,
  location          JSONB NOT NULL,
  geom              GEOMETRY(Point, 4326),
  clip_url          TEXT,
  bus_id            TEXT NOT NULL,
  timestamp         TIMESTAMPTZ NOT NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_timestamp
  ON incidents (timestamp);

CREATE INDEX IF NOT EXISTS idx_incidents_plate
  ON incidents (plate_text);

CREATE INDEX IF NOT EXISTS idx_incidents_geom
  ON incidents USING GIST (geom);
