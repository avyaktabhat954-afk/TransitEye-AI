-- ==========================================================
-- Migration 006: Seed placeholder road segments
-- TransitEye — Phase 1 Task 2
-- ==========================================================
-- WARNING: These coordinates are APPROXIMATE and
-- NON-AUTHORITATIVE. They represent real Delhi road
-- locations at a rough level for development/testing
-- of PostGIS spatial queries only.
--
-- These MUST be replaced with actual surveyed/authoritative
-- segment geometries when the team provides them.
--
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- ==========================================================

INSERT INTO road_segments (id, name, geom, ward, city) VALUES

  -- Kartavya Path (formerly Rajpath): ~2.3 km east-west
  ('SEG-DEL-001', 'Kartavya Path (Rajpath)',
    ST_GeomFromText('LINESTRING(77.2090 28.6139, 77.2295 28.6129)', 4326),
    'New Delhi', 'Delhi'),

  -- Ring Road segment: AIIMS to Moolchand (~3.5 km)
  ('SEG-DEL-002', 'Ring Road - AIIMS to Moolchand',
    ST_GeomFromText('LINESTRING(77.2075 28.5671, 77.2391 28.5689)', 4326),
    'South Delhi', 'Delhi'),

  -- Outer Ring Road: Punjabi Bagh Flyover area (~2.2 km)
  ('SEG-DEL-003', 'Outer Ring Road - Punjabi Bagh Flyover',
    ST_GeomFromText('LINESTRING(77.1283 28.6623, 77.1476 28.6701)', 4326),
    'West Delhi', 'Delhi')

ON CONFLICT (id) DO NOTHING;
