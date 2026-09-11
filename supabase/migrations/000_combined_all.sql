-- ==========================================================
-- TransitEye — Combined Schema Migration
-- Phase 1 Task 2: Database Schema
-- ==========================================================
--
-- This file concatenates all individual migrations (001–006)
-- into a single SQL script for execution via the Supabase
-- SQL Editor dashboard.
--
-- All statements are IDEMPOTENT (IF NOT EXISTS / ON CONFLICT).
-- Safe to run multiple times without side effects.
--
-- EXECUTION METHOD:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
--
-- ==========================================================


-- ----------------------------------------------------------
-- 001: Enable PostGIS Extension
-- ----------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis;


-- ----------------------------------------------------------
-- 002: Create road_segments table
-- ----------------------------------------------------------

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


-- ----------------------------------------------------------
-- 003: Create detections table
-- ----------------------------------------------------------
-- STATUS ENUM: Uses existing shared-schema values:
--   pending, confirmed, in_review, resolved, rejected
--
-- UNRESOLVED: Master plan describes a different lifecycle:
--   detected → verified → assigned → repaired → reverified
-- This discrepancy is documented but NOT resolved here.
-- ----------------------------------------------------------

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


-- ----------------------------------------------------------
-- 004: Create incidents table
-- ----------------------------------------------------------

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


-- ----------------------------------------------------------
-- 005: Create vehicle_density table
-- ----------------------------------------------------------

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


-- ----------------------------------------------------------
-- 006: Seed placeholder road segments
-- ----------------------------------------------------------
-- WARNING: Coordinates are APPROXIMATE and NON-AUTHORITATIVE.
-- For development/testing only. Must be replaced with actual
-- surveyed segment geometries when available.
-- ----------------------------------------------------------

INSERT INTO road_segments (id, name, geom, ward, city) VALUES

  ('SEG-DEL-001', 'Kartavya Path (Rajpath)',
    ST_GeomFromText('LINESTRING(77.2090 28.6139, 77.2295 28.6129)', 4326),
    'New Delhi', 'Delhi'),

  ('SEG-DEL-002', 'Ring Road - AIIMS to Moolchand',
    ST_GeomFromText('LINESTRING(77.2075 28.5671, 77.2391 28.5689)', 4326),
    'South Delhi', 'Delhi'),

  ('SEG-DEL-003', 'Outer Ring Road - Punjabi Bagh Flyover',
    ST_GeomFromText('LINESTRING(77.1283 28.6623, 77.1476 28.6701)', 4326),
    'West Delhi', 'Delhi')

ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------
-- 007: Synchronize geom from location JSONB
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_geom_from_location()
RETURNS TRIGGER AS $$
DECLARE
  lat_val NUMERIC;
  lon_val NUMERIC;
BEGIN
  IF NEW.location IS NOT NULL AND jsonb_typeof(NEW.location) = 'object' THEN
    BEGIN
      lat_val := (NEW.location->>'latitude')::NUMERIC;
      lon_val := (NEW.location->>'longitude')::NUMERIC;

      IF lat_val IS NOT NULL AND lon_val IS NOT NULL
         AND lat_val >= -90.0 AND lat_val <= 90.0
         AND lon_val >= -180.0 AND lon_val <= 180.0 THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(lon_val, lat_val), 4326);
      ELSE
        NEW.geom := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NEW.geom := NULL;
    END;
  ELSE
    NEW.geom := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_detections_sync_geom ON detections;
CREATE TRIGGER trg_detections_sync_geom
BEFORE INSERT OR UPDATE OF location ON detections
FOR EACH ROW
EXECUTE FUNCTION sync_geom_from_location();

DROP TRIGGER IF EXISTS trg_incidents_sync_geom ON incidents;
CREATE TRIGGER trg_incidents_sync_geom
BEFORE INSERT OR UPDATE OF location ON incidents
FOR EACH ROW
EXECUTE FUNCTION sync_geom_from_location();

DROP TRIGGER IF EXISTS trg_vehicle_density_sync_geom ON vehicle_density;
CREATE TRIGGER trg_vehicle_density_sync_geom
BEFORE INSERT OR UPDATE OF location ON vehicle_density
FOR EACH ROW
EXECUTE FUNCTION sync_geom_from_location();


-- ----------------------------------------------------------
-- Verification queries (run after migration to confirm)
-- ----------------------------------------------------------
-- Uncomment and run these to verify:
--
-- SELECT PostGIS_Full_Version();
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('road_segments','detections','incidents','vehicle_density');
--
-- SELECT COUNT(*) AS segment_count FROM road_segments;
--
-- SELECT id, name, ST_AsText(geom) AS geom_wkt FROM road_segments;
