-- ==========================================================
-- Migration 007: Synchronize geom from location JSONB
-- TransitEye — Phase 1 Task 3
-- ==========================================================
-- Automatically populates and updates the PostGIS `geom` column
-- (GEOMETRY(Point, 4326)) from the `location` JSONB field
-- (extracting latitude and longitude) on:
--   - detections
--   - incidents
--   - vehicle_density
--
-- Robustness:
--   - Checks that location is an object and latitude/longitude exist.
--   - Validates latitude (-90 to 90) and longitude (-180 to 180).
--   - If coordinates are missing or invalid, geom is set to NULL
--     without failing the insert/update transaction.
--   - Handles both INSERT and UPDATE operations on `location`.
-- ==========================================================

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

-- Apply to detections
DROP TRIGGER IF EXISTS trg_detections_sync_geom ON detections;
CREATE TRIGGER trg_detections_sync_geom
BEFORE INSERT OR UPDATE OF location ON detections
FOR EACH ROW
EXECUTE FUNCTION sync_geom_from_location();

-- Apply to incidents
DROP TRIGGER IF EXISTS trg_incidents_sync_geom ON incidents;
CREATE TRIGGER trg_incidents_sync_geom
BEFORE INSERT OR UPDATE OF location ON incidents
FOR EACH ROW
EXECUTE FUNCTION sync_geom_from_location();

-- Apply to vehicle_density
DROP TRIGGER IF EXISTS trg_vehicle_density_sync_geom ON vehicle_density;
CREATE TRIGGER trg_vehicle_density_sync_geom
BEFORE INSERT OR UPDATE OF location ON vehicle_density
FOR EACH ROW
EXECUTE FUNCTION sync_geom_from_location();
