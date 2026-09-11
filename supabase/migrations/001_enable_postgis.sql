-- ==========================================================
-- Migration 001: Enable PostGIS Extension
-- TransitEye — Phase 1 Task 2
-- ==========================================================
-- Enables the PostGIS extension for geospatial data types
-- (GEOMETRY, GEOGRAPHY) and spatial functions (ST_Distance,
-- ST_DWithin, ST_GeomFromText, etc.)
--
-- This is idempotent: safe to run multiple times.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS postgis;
