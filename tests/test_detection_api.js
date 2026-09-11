/**
 * Test script for Detection Ingestion API (Checkpoint 3).
 * Uses Node native fetch to verify all required scenarios.
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
// Ingestion occurs prior to spatial road-segment matching (Task 4)
roadDefectPayload.segment_id = null;


async function runTests() {
  console.log("=== Testing TransitEye Backend Detection API ===\n");
  let passed = 0;
  let total = 0;

  // 1. GET /api/health
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === "healthy") {
      console.log("[PASS] 1. GET /api/health returned 200 OK with healthy status");
      console.log("       Body:", JSON.stringify(data));
      passed++;
    } else {
      console.error("[FAIL] 1. GET /api/health unexpected response:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 1. GET /api/health error:", err.message);
  }

  // 2. GET /api/detections (initial empty or existing)
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`);
    const data = await res.json();
    if (res.status === 200 && data.success === true && Array.isArray(data.data)) {
      console.log(`[PASS] 2. GET /api/detections returned 200 OK (count: ${data.count})`);
      passed++;
    } else {
      console.error("[FAIL] 2. GET /api/detections unexpected response:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 2. GET /api/detections error:", err.message);
  }

  // 3. POST /api/detections (valid road-defect)
  total++;
  let createdId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roadDefectPayload),
    });
    const data = await res.json();
    if (res.status === 201 && data.success === true && data.data) {
      createdId = data.data.id;
      console.log("[PASS] 3. POST /api/detections returned 201 Created");
      console.log("       Created ID:", createdId, "Type:", data.data.type);
      passed++;
    } else {
      console.error("[FAIL] 3. POST /api/detections unexpected response:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 3. POST /api/detections error:", err.message);
  }

  // 4. GET /api/detections (confirm presence)
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`);
    const data = await res.json();
    const found = data.data.find((d) => d.id === createdId);
    if (res.status === 200 && found) {
      console.log("[PASS] 4. GET /api/detections confirmed created detection is present");
      console.log("       Found record:", JSON.stringify(found, null, 2));
      passed++;
    } else {
      console.error("[FAIL] 4. Created detection not found in GET /api/detections");
    }
  } catch (err) {
    console.error("[FAIL] 4. GET /api/detections verification error:", err.message);
  }

  // 5. POST /api/detections (invalid schema payload: missing bus_id, bad confidence, invalid latitude)
  total++;
  try {
    const badPayload = {
      type: "invalid_type",
      confidence: 1.85,
      severity: "extreme_danger", // invalid enum
      location: { latitude: 125.0, longitude: 77.2 }, // invalid latitude
    };
    const res = await fetch(`${BASE_URL}/api/detections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badPayload),
    });
    const data = await res.json();
    if (res.status === 400 && data.success === false && Array.isArray(data.details)) {
      console.log("[PASS] 5. POST /api/detections rejected invalid schema with 400 Bad Request");
      console.log("       Validation errors caught:", data.details);
      passed++;
    } else {
      console.error("[FAIL] 5. Invalid payload was not properly rejected:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 5. POST /api/detections invalid test error:", err.message);
  }

  // 6. POST /api/detections (malformed JSON syntax)
  total++;
  try {
    const res = await fetch(`${BASE_URL}/api/detections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ bad json",
    });
    const data = await res.json();
    if (res.status === 400 && data.success === false) {
      console.log("[PASS] 6. POST /api/detections rejected malformed JSON syntax with 400 Bad Request");
      console.log("       Error message:", data.error);
      passed++;
    } else {
      console.error("[FAIL] 6. Malformed JSON was not rejected with 400:", res.status, data);
    }
  } catch (err) {
    console.error("[FAIL] 6. Malformed JSON test error:", err.message);
  }

  console.log(`\n===========================================`);
  console.log(`Results: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
