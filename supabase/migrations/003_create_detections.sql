-- ==========================================================
-- Migration 003: Create detections table
-- TransitEye — Phase 1 Task 2
-- ==========================================================
-- Mirrors shared/schemas/detection.schema.json exactly.
--
-- DUAL LOCATION STORAGE:
--   location (JSONB) — preserves exact API contract shape
--   geom (GEOMETRY)  — enables PostGIS spatial queries
--
-- STATUS ENUM NOTE:
--   Uses existing shared-schema values:
--     pending, confirmed, in_review, resolved, rejected
--
--   The master plan describes a DIFFERENT lifecycle:
--     detected → verified → assigned → repaired → reverified
--
--   This is an UNRESOLVED TEAM DECISION. The database uses
--   the shared-schema values. Neither source has been modified
--   to reconcile this discrepancy.
--
-- Idempotent: uses IF NOT EXISTS.
-- ==========================================================

CREATE TABLE IF NOT EXISTS detections (
  id                  TEXT PRIMARY KEY,
  type                TEXT NOT NULL
                        CHECK (type IN ('road_defect', 'waterlogging', 'vru_safety')),
  subtype             TEXT NOT NULL,
  confidence          REAL NOT NULL
                        CHECK (confidence >= 0 AND confidence <= 1),
  severity            TEXT NOT NULL
                        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location            JSONB NOT NULL,
  geom                GEOMETRY(Point, 4326),
  segment_id          TEXT REFERENCES road_segments(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'confirmed', 'in_review', 'resolved', 'rejected'
                        )),
  confirmed_by_count  INTEGER NOT NULL DEFAULT 1
                        CHECK (confirmed_by_count >= 1),
  bus_id              TEXT NOT NULL,
  timestamp           TIMESTAMPTZ NOT NULL,
  thumbnail_url       TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detections_type
  ON detections (type);

CREATE INDEX IF NOT EXISTS idx_detections_segment
  ON detections (segment_id);

CREATE INDEX IF NOT EXISTS idx_detections_status
  ON detections (status);

CREATE INDEX IF NOT EXISTS idx_detections_timestamp
  ON detections (timestamp);

CREATE INDEX IF NOT EXISTS idx_detections_geom
  ON detections USING GIST (geom);
