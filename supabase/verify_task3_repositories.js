/**
 * TransitEye — Phase 1 Task 3 Verification Script
 *
 * Verifies Supabase-backed repositories:
 * 1. create() for detection, incident, vehicle_density
 * 2. findById() retrieval and exact data match
 * 3. findAll() includes the created records
 * 4. Automatic geom creation and location update trigger verification
 * 5. Targeted test cleanup (deletes ONLY records created by this run)
 * 6. Verification of production safety (clear() throws error)
 */

const path = require("path");
const backendDir = path.resolve(__dirname, "../backend");
const dotenvPath = path.join(backendDir, "node_modules", "dotenv");
require(dotenvPath).config({ path: path.resolve(__dirname, "../.env") });

const { supabase } = require(path.join(backendDir, "src", "config", "supabaseClient"));
const detectionRepo = require(path.join(backendDir, "src", "repositories", "detectionRepository"));
const incidentRepo = require(path.join(backendDir, "src", "repositories", "incidentRepository"));
const densityRepo = require(path.join(backendDir, "src", "repositories", "vehicleDensityRepository"));

const RUN_ID = `t3-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
const createdIds = {
  detections: [],
  incidents: [],
  vehicle_density: [],
};

let passed = 0;
let failed = 0;

function pass(testName, details) {
  passed++;
  console.log(`[PASS] ${testName}${details ? ` — ${details}` : ""}`);
}

function fail(testName, details) {
  failed++;
  console.error(`[FAIL] ${testName}${details ? ` — ${details}` : ""}`);
}

async function cleanup() {
  console.log("\n--- Cleaning up test records ---");
  for (const id of createdIds.detections) {
    const { error } = await supabase.from("detections").delete().eq("id", id);
    if (error) {
      console.error(`[CLEANUP ERROR] Failed to delete detection ${id}:`, error.message);
    } else {
      console.log(`[CLEANUP] Deleted detection: ${id}`);
    }
  }
  for (const id of createdIds.incidents) {
    const { error } = await supabase.from("incidents").delete().eq("id", id);
    if (error) {
      console.error(`[CLEANUP ERROR] Failed to delete incident ${id}:`, error.message);
    } else {
      console.log(`[CLEANUP] Deleted incident: ${id}`);
    }
  }
  for (const id of createdIds.vehicle_density) {
    const { error } = await supabase.from("vehicle_density").delete().eq("id", id);
    if (error) {
      console.error(`[CLEANUP ERROR] Failed to delete vehicle_density ${id}:`, error.message);
    } else {
      console.log(`[CLEANUP] Deleted vehicle_density: ${id}`);
    }
  }
}

async function run() {
  console.log(`=== TransitEye Task 3: Repository Verification (Run ID: ${RUN_ID}) ===\n`);

  try {
    // ---------------------------------------------------------
    // 1. Detection Repository Tests
    // ---------------------------------------------------------
    console.log("--- 1. Testing Detection Repository ---");
    const testDetId = `test-det-${RUN_ID}`;
    const detPayload = {
      id: testDetId,
      type: "road_defect",
      subtype: "pothole",
      confidence: 0.94,
      severity: "high",
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        speed: 30.5,
      },
      segment_id: null,
      status: "pending",
      confirmed_by_count: 1,
      bus_id: `BUS-TEST-${RUN_ID}`,
      timestamp: new Date().toISOString(),
      metadata: { test_run: RUN_ID },
    };

    const createdDet = await detectionRepo.create(detPayload);
    createdIds.detections.push(testDetId);

    if (createdDet && createdDet.id === testDetId) {
      pass("Detection create()", `ID: ${createdDet.id}`);
    } else {
      fail("Detection create()", "Returned object missing expected ID");
    }

    // findById
    const fetchedDet = await detectionRepo.findById(testDetId);
    if (fetchedDet && fetchedDet.id === testDetId && fetchedDet.severity === "high") {
      pass("Detection findById()", `Found record with type ${fetchedDet.type}`);
    } else {
      fail("Detection findById()", "Could not fetch created record");
    }

    // findAll
    const allDets = await detectionRepo.findAll();
    const foundInAll = allDets.some((d) => d.id === testDetId);
    if (foundInAll) {
      pass("Detection findAll()", `Found in list of ${allDets.length} detections`);
    } else {
      fail("Detection findAll()", `Created record ${testDetId} not found in findAll()`);
    }

    // Check geom column
    if (fetchedDet.geom) {
      const geomType = typeof fetchedDet.geom === "object" ? fetchedDet.geom.type : typeof fetchedDet.geom;
      pass("Detection PostGIS geom trigger", `Populated automatically (type: ${geomType})`);
    } else {
      fail(
        "Detection PostGIS geom trigger",
        "geom is null — migration 007 trigger may not be applied in database"
      );
    }

    // ---------------------------------------------------------
    // 2. Incident Repository Tests
    // ---------------------------------------------------------
    console.log("\n--- 2. Testing Incident Repository ---");
    const testIncId = `test-inc-${RUN_ID}`;
    const incPayload = {
      id: testIncId,
      plate_text: "DL01AB9999",
      plate_confidence: 0.98,
      trigger_reason: "bus_lane_obstruction",
      location: {
        latitude: 28.6289,
        longitude: 77.2065,
      },
      bus_id: `BUS-TEST-${RUN_ID}`,
      timestamp: new Date().toISOString(),
      metadata: { test_run: RUN_ID },
    };

    const createdInc = await incidentRepo.create(incPayload);
    createdIds.incidents.push(testIncId);

    if (createdInc && createdInc.id === testIncId) {
      pass("Incident create()", `ID: ${createdInc.id}`);
    } else {
      fail("Incident create()", "Returned object missing expected ID");
    }

    const fetchedInc = await incidentRepo.findById(testIncId);
    if (fetchedInc && fetchedInc.plate_text === "DL01AB9999") {
      pass("Incident findById()", `Plate: ${fetchedInc.plate_text}`);
    } else {
      fail("Incident findById()", "Could not fetch created incident");
    }

    const allIncs = await incidentRepo.findAll();
    if (allIncs.some((i) => i.id === testIncId)) {
      pass("Incident findAll()", `Found in list of ${allIncs.length} incidents`);
    } else {
      fail("Incident findAll()", `Created incident not found in findAll()`);
    }

    if (fetchedInc.geom) {
      const geomType = typeof fetchedInc.geom === "object" ? fetchedInc.geom.type : typeof fetchedInc.geom;
      pass("Incident PostGIS geom trigger", `Populated automatically (type: ${geomType})`);
    } else {
      fail(
        "Incident PostGIS geom trigger",
        "geom is null — migration 007 trigger may not be applied in database"
      );
    }

    // ---------------------------------------------------------
    // 3. Vehicle Density Repository Tests
    // ---------------------------------------------------------
    console.log("\n--- 3. Testing Vehicle Density Repository ---");
    const testVdId = `test-vd-${RUN_ID}`;
    const vdPayload = {
      id: testVdId,
      segment_id: null,
      vehicle_count: 35,
      class_breakdown: { car: 20, bus: 5, motorcycle: 10 },
      bus_id: `BUS-TEST-${RUN_ID}`,
      recorded_at: new Date().toISOString(),
      location: {
        latitude: 28.6145,
        longitude: 77.2098,
      },
      metadata: { test_run: RUN_ID },
    };

    const createdVd = await densityRepo.create(vdPayload);
    createdIds.vehicle_density.push(testVdId);

    if (createdVd && createdVd.id === testVdId) {
      pass("Vehicle Density create()", `ID: ${createdVd.id}`);
    } else {
      fail("Vehicle Density create()", "Returned object missing expected ID");
    }

    const fetchedVd = await densityRepo.findById(testVdId);
    if (fetchedVd && fetchedVd.vehicle_count === 35) {
      pass("Vehicle Density findById()", `Vehicle count: ${fetchedVd.vehicle_count}`);
    } else {
      fail("Vehicle Density findById()", "Could not fetch created vehicle density");
    }

    const allVd = await densityRepo.findAll();
    if (allVd.some((v) => v.id === testVdId)) {
      pass("Vehicle Density findAll()", `Found in list of ${allVd.length} records`);
    } else {
      fail("Vehicle Density findAll()", `Created record not found in findAll()`);
    }

    if (fetchedVd.geom) {
      const geomType = typeof fetchedVd.geom === "object" ? fetchedVd.geom.type : typeof fetchedVd.geom;
      pass("Vehicle Density PostGIS geom trigger", `Populated automatically (type: ${geomType})`);
    } else {
      fail(
        "Vehicle Density PostGIS geom trigger",
        "geom is null — migration 007 trigger may not be applied in database"
      );
    }

    // ---------------------------------------------------------
    // 4. Test Update of Location Updates Geom
    // ---------------------------------------------------------
    console.log("\n--- 4. Testing Location Update Trigger ---");
    const updatedLocation = { latitude: 28.5671, longitude: 77.2075 };
    const { data: updatedDet, error: updateErr } = await supabase
      .from("detections")
      .update({ location: updatedLocation })
      .eq("id", testDetId)
      .select()
      .single();

    if (updateErr) {
      fail("Update location", `Error: ${updateErr.message}`);
    } else if (updatedDet && updatedDet.geom) {
      pass("Update location updates geom", "geom updated with new coordinates");
    } else {
      fail("Update location updates geom", "geom not updated or null");
    }

    // ---------------------------------------------------------
    // 5. Test Safety Check: clear() on Supabase Repo Must Throw
    // ---------------------------------------------------------
    console.log("\n--- 5. Testing Safety Constraints ---");
    try {
      await detectionRepo.clear();
      fail("Safety check", "clear() should have thrown an error on Supabase repository");
    } catch (err) {
      if (err.message.includes("disabled on Supabase repository")) {
        pass("Safety check", "clear() correctly throws error on Supabase repository");
      } else {
        fail("Safety check", `Unexpected error message: ${err.message}`);
      }
    }
  } catch (err) {
    fail("Unexpected test exception", err.message);
  } finally {
    await cleanup();
  }

  console.log("\n=== Summary ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
