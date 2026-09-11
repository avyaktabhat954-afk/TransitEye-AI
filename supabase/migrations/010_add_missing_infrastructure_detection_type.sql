-- ==========================================================
-- Migration 010: Add missing_infrastructure to detections type constraint
-- TransitEye — Contract Alignment
-- ==========================================================
-- Updates the detections_type_check constraint on the detections table
-- to include 'missing_infrastructure'.
--
-- Idempotent: Drops constraint if present and re-adds with updated allowed types.
-- ==========================================================

ALTER TABLE detections
  DROP CONSTRAINT IF EXISTS detections_type_check;

ALTER TABLE detections
  ADD CONSTRAINT detections_type_check
  CHECK (type IN ('road_defect', 'missing_infrastructure', 'waterlogging', 'vru_safety'));
