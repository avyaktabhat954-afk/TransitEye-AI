/**
 * Test script for Checkpoint 4 API contracts:
 * Detections, Incidents / ANPR, and Vehicle Density.
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5000";

const roadDefectPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../shared/schemas/examples/road_defect.json"),
    "utf8"
  )
);
const incidentPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../shared/schemas/examples/incident_anpr.json"),
    "utf8"
  )
);
const densityPayload = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../shared/schemas/examples/vehicle_density.json"),
    "utf8"
  )
);

async function runTests() {
  console.log("=== Testing TransitEye Checkpoint 4 Contracts ===\n");
  let passed = 0;
  let total = 0;

  // 1. GET /api/health
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === "healthy") {
      console.log("[PASS] 1. GET /api/health (200 OK, healthy)");
      passed++;
    } else {
      console.error("[FAIL] 1. GET /api/health unexpected:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 1. GET /api/health error:", err.message);
  }

  // 2. GET /api/detections
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`);
    const data = await res.json();
    if (res.status === 200 && data.success === true && Array.isArray(data.data)) {
      console.log(`[PASS] 2. GET /api/detections (200 OK, initial count: ${data.count})`);
      passed++;
    } else {
      console.error("[FAIL] 2. GET /api/detections unexpected:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 2. GET /api/detections error:", err.message);
  }

  // 3. POST /api/detections (valid)
  total++;
  let detectionId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roadDefectPayload),
    });
    const data = await res.json();
    if (res.status === 201 && data.success === true && data.data) {
      detectionId = data.data.id;
      console.log(`[PASS] 3. POST /api/detections (201 Created, ID: ${detectionId})`);
      passed++;
    } else {
      console.error("[FAIL] 3. POST /api/detections unexpected:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 3. POST /api/detections error:", err.message);
  }

  // 4. GET /api/detections (verify presence)
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`);
    const data = await res.json();
    const found = data.data.find((d) => d.id === detectionId);
    if (res.status === 200 && found) {
      console.log(`[PASS] 4. GET /api/detections confirmed record presence (count: ${data.count})`);
      passed++;
    } else {
      console.error("[FAIL] 4. Detection not found in GET /api/detections");
    }
  } catch (err) {
    console.error("[FAIL] 4. GET /api/detections error:", err.message);
  }

  // 5. POST /api/incidents (valid)
  total++;
  let incidentId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incidentPayload),
    });
    const data = await res.json();
    if (res.status === 201 && data.success === true && data.data) {
      incidentId = data.data.id;
      console.log(`[PASS] 5. POST /api/incidents (201 Created, Plate: ${data.data.plate_text})`);
      passed++;
    } else {
      console.error("[FAIL] 5. POST /api/incidents unexpected:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 5. POST /api/incidents error:", err.message);
  }

  // 6. GET /api/incidents (confirm presence)
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/incidents`);
    const data = await res.json();
    const found = data.data.find((inc) => inc.id === incidentId);
    if (res.status === 200 && found) {
      console.log(`[PASS] 6. GET /api/incidents confirmed record presence (count: ${data.count})`);
      passed++;
    } else {
      console.error("[FAIL] 6. Incident not found in GET /api/incidents");
    }
  } catch (err) {
    console.error("[FAIL] 6. GET /api/incidents error:", err.message);
  }

  // 7. POST /api/incidents (invalid schema)
  total++;
  try {
    const badIncident = {
      plate_text: "",
      plate_confidence: 1.5,
      location: { latitude: 120.0, longitude: 200.0 },
    };
    const res = await fetch(`${BASE_URL}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badIncident),
    });
    const data = await res.json();
    if (res.status === 400 && data.success === false && Array.isArray(data.details)) {
      console.log("[PASS] 7. POST /api/incidents correctly rejected invalid payload with 400 Bad Request");
      console.log("       Errors caught:", data.details);
      passed++;
    } else {
      console.error("[FAIL] 7. Invalid incident was not rejected with 400:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 7. POST /api/incidents rejection error:", err.message);
  }

  // 8. POST /api/vehicle-density (valid)
  total++;
  let densityId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/vehicle-density`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(densityPayload),
    });
    const data = await res.json();
    if (res.status === 201 && data.success === true && data.data) {
      densityId = data.data.id;
      console.log(`[PASS] 8. POST /api/vehicle-density (201 Created, Count: ${data.data.vehicle_count})`);
      passed++;
    } else {
      console.error("[FAIL] 8. POST /api/vehicle-density unexpected:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 8. POST /api/vehicle-density error:", err.message);
  }

  // 9. GET /api/vehicle-density (confirm presence)
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/vehicle-density`);
    const data = await res.json();
    const found = data.data.find((d) => d.id === densityId);
    if (res.status === 200 && found) {
      console.log(`[PASS] 9. GET /api/vehicle-density confirmed record presence (count: ${data.count})`);
      passed++;
    } else {
      console.error("[FAIL] 9. Vehicle density record not found in GET /api/vehicle-density");
    }
  } catch (err) {
    console.error("[FAIL] 9. GET /api/vehicle-density error:", err.message);
  }

  // 10. POST /api/vehicle-density (invalid schema)
  total++;
  try {
    const badDensity = {
      vehicle_count: -5,
      class_breakdown: { car: -2 },
      bus_id: "",
    };
    const res = await fetch(`${BASE_URL}/api/vehicle-density`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badDensity),
    });
    const data = await res.json();
    if (res.status === 400 && data.success === false && Array.isArray(data.details)) {
      console.log("[PASS] 10. POST /api/vehicle-density correctly rejected invalid payload with 400 Bad Request");
      console.log("        Errors caught:", data.details);
      passed++;
    } else {
      console.error("[FAIL] 10. Invalid vehicle density was not rejected with 400:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 10. POST /api/vehicle-density rejection error:", err.message);
  }

  // 11. Malformed JSON handling
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not a json string",
    });
    const data = await res.json();
    if (res.status === 400 && data.success === false) {
      console.log("[PASS] 11. Malformed JSON payload correctly rejected with 400 Bad Request");
      passed++;
    } else {
      console.error("[FAIL] 11. Malformed JSON did not return 400:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 11. Malformed JSON error:", err.message);
  }

  console.log(`\n===========================================`);
  console.log(`Results: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
