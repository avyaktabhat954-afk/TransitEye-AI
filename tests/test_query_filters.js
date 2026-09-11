/**
 * Comprehensive Test Suite for Query Filtering & Pagination
 *
 * Tests:
 * - GET /api/detections (type, subtype, status, severity, segment_id, since, until, limit, offset)
 * - GET /api/incidents (bus_id, trigger_reason, since, until, limit, offset)
 * - GET /api/vehicle-density (segment_id, since, until, limit, offset)
 * - Validation (invalid limit, invalid offset, invalid enum, invalid timestamp, since > until)
 * - Response structure (success, count, data as Array, pagination metadata)
 * - Isolated setup and teardown
 */

const BASE_URL = "http://localhost:5000";

const RUN_ID = `qf-${Date.now()}`;
const testDetection1 = {
  id: `det-${RUN_ID}-1`,
  type: "road_defect",
  subtype: "pothole",
  confidence: 0.95,
  severity: "critical",
  location: { latitude: 28.6139, longitude: 77.209 },
  segment_id: "SEG-DEL-001",
  status: "confirmed",
  confirmed_by_count: 2,
  bus_id: "BUS-DEL-101",
  timestamp: "2026-09-01T10:00:00.000Z",
};

const testDetection2 = {
  id: `det-${RUN_ID}-2`,
  type: "waterlogging",
  subtype: "standing_water",
  confidence: 0.85,
  severity: "medium",
  location: { latitude: 28.6328, longitude: 77.2195 },
  segment_id: "SEG-DEL-002",
  status: "pending",
  confirmed_by_count: 1,
  bus_id: "BUS-DEL-102",
  timestamp: "2026-09-05T15:00:00.000Z",
};

const testDetection3 = {
  id: `det-${RUN_ID}-3`,
  type: "vru_safety",
  subtype: "pedestrian_near_lane",
  confidence: 0.78,
  severity: "low",
  location: { latitude: 28.6139, longitude: 77.209 },
  segment_id: "SEG-DEL-001",
  status: "in_review",
  confirmed_by_count: 1,
  bus_id: "BUS-DEL-103",
  timestamp: "2026-09-08T20:00:00.000Z",
};

const testIncident1 = {
  id: `inc-${RUN_ID}-1`,
  plate_text: "DL01AA1111",
  plate_confidence: 0.96,
  trigger_reason: "bus_lane_violation",
  location: { latitude: 28.6139, longitude: 77.209 },
  bus_id: "BUS-DEL-101",
  timestamp: "2026-09-02T11:00:00.000Z",
};

const testIncident2 = {
  id: `inc-${RUN_ID}-2`,
  plate_text: "DL02BB2222",
  plate_confidence: 0.91,
  trigger_reason: "reckless_overtake",
  location: { latitude: 28.6328, longitude: 77.2195 },
  bus_id: "BUS-DEL-102",
  timestamp: "2026-09-06T14:00:00.000Z",
};

const testDensity1 = {
  id: `vd-${RUN_ID}-1`,
  segment_id: "SEG-DEL-001",
  vehicle_count: 45,
  class_breakdown: { car: 30, bus: 5, truck: 2, motorcycle: 8 },
  bus_id: "BUS-DEL-101",
  recorded_at: "2026-09-03T09:00:00.000Z",
  location: { latitude: 28.6139, longitude: 77.209 },
};

const testDensity2 = {
  id: `vd-${RUN_ID}-2`,
  segment_id: "SEG-DEL-002",
  vehicle_count: 18,
  class_breakdown: { car: 10, bus: 2, truck: 1, motorcycle: 5 },
  bus_id: "BUS-DEL-102",
  recorded_at: "2026-09-07T18:00:00.000Z",
  location: { latitude: 28.6328, longitude: 77.2195 },
};

async function setupFixtures() {
  console.log("--- Setting up test fixtures ---");
  await fetch(`${BASE_URL}/api/detections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testDetection1),
  });
  await fetch(`${BASE_URL}/api/detections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testDetection2),
  });
  await fetch(`${BASE_URL}/api/detections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testDetection3),
  });

  await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testIncident1),
  });
  await fetch(`${BASE_URL}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testIncident2),
  });

  await fetch(`${BASE_URL}/api/vehicle-density`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testDensity1),
  });
  await fetch(`${BASE_URL}/api/vehicle-density`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testDensity2),
  });
  console.log("Fixtures created successfully.\n");
}

async function cleanupFixtures() {
  console.log("\n--- Cleaning up test fixtures ---");
  try {
    const path = require("path");
    const { supabase } = require("../backend/src/config/supabaseClient");
    await supabase.from("detections").delete().in("id", [testDetection1.id, testDetection2.id, testDetection3.id]);
    await supabase.from("incidents").delete().in("id", [testIncident1.id, testIncident2.id]);
    await supabase.from("vehicle_density").delete().in("id", [testDensity1.id, testDensity2.id]);
    console.log("Fixtures cleaned up cleanly.");
  } catch (err) {
    console.warn("Cleanup error:", err.message);
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("TransitEye — Query Filtering & Pagination Test Suite");
  console.log("==========================================================\n");

  await setupFixtures();

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = "") {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}${details ? ` — ${details}` : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${details ? ` — ${details}` : ""}`);
    }
  }

  // =========================================================================
  // DETECTIONS TESTS
  // =========================================================================
  console.log(">>> Testing Detections Query Filtering & Pagination <<<");

  // 1. Default pagination structure
  try {
    const res = await fetch(`${BASE_URL}/api/detections`);
    const data = await res.json();
    assert(
      "Detections: default pagination response structure",
      res.status === 200 &&
        data.success === true &&
        Array.isArray(data.data) &&
        typeof data.count === "number" &&
        data.pagination &&
        data.pagination.limit === 50 &&
        data.pagination.offset === 0 &&
        typeof data.pagination.total === "number",
      `Count: ${data.count}, Total: ${data.pagination?.total}`
    );
  } catch (e) {
    assert("Detections: default pagination response structure", false, e.message);
  }

  // 2. Type filter
  try {
    const res = await fetch(`${BASE_URL}/api/detections?type=waterlogging`);
    const data = await res.json();
    const allMatch = data.data.every((d) => d.type === "waterlogging");
    const containsDet2 = data.data.some((d) => d.id === testDetection2.id);
    assert(
      "Detections: type filter (?type=waterlogging)",
      res.status === 200 && allMatch && containsDet2,
      `Matched ${data.count} items, all waterlogging`
    );
  } catch (e) {
    assert("Detections: type filter", false, e.message);
  }

  // 3. Subtype filter
  try {
    const res = await fetch(`${BASE_URL}/api/detections?subtype=pothole`);
    const data = await res.json();
    const allMatch = data.data.every((d) => d.subtype === "pothole");
    const containsDet1 = data.data.some((d) => d.id === testDetection1.id);
    assert(
      "Detections: subtype filter (?subtype=pothole)",
      res.status === 200 && allMatch && containsDet1,
      `Matched ${data.count} items, all pothole`
    );
  } catch (e) {
    assert("Detections: subtype filter", false, e.message);
  }

  // 4. Status filter
  try {
    const res = await fetch(`${BASE_URL}/api/detections?status=confirmed`);
    const data = await res.json();
    const allMatch = data.data.every((d) => d.status === "confirmed");
    const containsDet1 = data.data.some((d) => d.id === testDetection1.id);
    assert(
      "Detections: status filter (?status=confirmed)",
      res.status === 200 && allMatch && containsDet1,
      `Matched ${data.count} items, all confirmed`
    );
  } catch (e) {
    assert("Detections: status filter", false, e.message);
  }

  // 5. Severity filter
  try {
    const res = await fetch(`${BASE_URL}/api/detections?severity=critical`);
    const data = await res.json();
    const allMatch = data.data.every((d) => d.severity === "critical");
    const containsDet1 = data.data.some((d) => d.id === testDetection1.id);
    assert(
      "Detections: severity filter (?severity=critical)",
      res.status === 200 && allMatch && containsDet1,
      `Matched ${data.count} items, all critical`
    );
  } catch (e) {
    assert("Detections: severity filter", false, e.message);
  }

  // 6. Segment_id filter
  try {
    const res = await fetch(`${BASE_URL}/api/detections?segment_id=SEG-DEL-002`);
    const data = await res.json();
    const allMatch = data.data.every((d) => d.segment_id === "SEG-DEL-002");
    const containsDet2 = data.data.some((d) => d.id === testDetection2.id);
    assert(
      "Detections: segment_id filter (?segment_id=SEG-DEL-002)",
      res.status === 200 && allMatch && containsDet2,
      `Matched ${data.count} items on SEG-DEL-002`
    );
  } catch (e) {
    assert("Detections: segment_id filter", false, e.message);
  }

  // 7. Time range (since / until)
  try {
    const res = await fetch(
      `${BASE_URL}/api/detections?since=2026-09-04T00:00:00Z&until=2026-09-06T00:00:00Z`
    );
    const data = await res.json();
    const hasDet2 = data.data.some((d) => d.id === testDetection2.id);
    const hasDet1 = data.data.some((d) => d.id === testDetection1.id);
    const hasDet3 = data.data.some((d) => d.id === testDetection3.id);
    assert(
      "Detections: time range filter (since & until)",
      res.status === 200 && hasDet2 && !hasDet1 && !hasDet3,
      `Found testDet2, excluded testDet1 and testDet3`
    );
  } catch (e) {
    assert("Detections: time range filter", false, e.message);
  }

  // 8. Combined filters
  try {
    const res = await fetch(
      `${BASE_URL}/api/detections?type=road_defect&segment_id=SEG-DEL-001&status=confirmed`
    );
    const data = await res.json();
    const match = data.data.some((d) => d.id === testDetection1.id);
    const noMismatch = data.data.every(
      (d) => d.type === "road_defect" && d.segment_id === "SEG-DEL-001" && d.status === "confirmed"
    );
    assert(
      "Detections: combined filters (type + segment_id + status)",
      res.status === 200 && match && noMismatch,
      `Precisely matched combined filter`
    );
  } catch (e) {
    assert("Detections: combined filters", false, e.message);
  }

  // 9. Limit and Offset pagination
  try {
    const resPage1 = await fetch(`${BASE_URL}/api/detections?limit=1&offset=0`);
    const dataPage1 = await resPage1.json();
    const resPage2 = await fetch(`${BASE_URL}/api/detections?limit=1&offset=1`);
    const dataPage2 = await resPage2.json();

    const p1Id = dataPage1.data[0]?.id;
    const p2Id = dataPage2.data[0]?.id;
    assert(
      "Detections: pagination limit and offset (?limit=1&offset=0 vs offset=1)",
      resPage1.status === 200 &&
        resPage2.status === 200 &&
        dataPage1.data.length === 1 &&
        dataPage2.data.length === 1 &&
        p1Id !== p2Id &&
        dataPage1.pagination.limit === 1 &&
        dataPage2.pagination.offset === 1,
      `Page 1 ID: ${p1Id}, Page 2 ID: ${p2Id}`
    );
  } catch (e) {
    assert("Detections: pagination limit and offset", false, e.message);
  }

  // 10. Maximum limit allowed (200)
  try {
    const res = await fetch(`${BASE_URL}/api/detections?limit=200`);
    const data = await res.json();
    assert(
      "Detections: maximum limit boundary (?limit=200)",
      res.status === 200 && data.pagination.limit === 200,
      `Accepted limit 200`
    );
  } catch (e) {
    assert("Detections: maximum limit boundary", false, e.message);
  }

  // 11. Validation: invalid limit (> 200 or < 1 or string)
  try {
    const resOver = await fetch(`${BASE_URL}/api/detections?limit=250`);
    const dataOver = await resOver.json();
    const resUnder = await fetch(`${BASE_URL}/api/detections?limit=0`);
    const dataUnder = await resUnder.json();
    const resAlpha = await fetch(`${BASE_URL}/api/detections?limit=abc`);
    const dataAlpha = await resAlpha.json();

    assert(
      "Detections validation: invalid limit returns 400 Bad Request",
      resOver.status === 400 &&
        resUnder.status === 400 &&
        resAlpha.status === 400 &&
        dataOver.success === false &&
        Array.isArray(dataOver.details),
      `Properly rejected limit=250, limit=0, limit=abc`
    );
  } catch (e) {
    assert("Detections validation: invalid limit", false, e.message);
  }

  // 12. Validation: invalid offset (< 0 or string)
  try {
    const resNeg = await fetch(`${BASE_URL}/api/detections?offset=-5`);
    const dataNeg = await resNeg.json();
    const resAlpha = await fetch(`${BASE_URL}/api/detections?offset=not_num`);
    const dataAlpha = await resAlpha.json();

    assert(
      "Detections validation: invalid offset returns 400 Bad Request",
      resNeg.status === 400 &&
        resAlpha.status === 400 &&
        dataNeg.success === false &&
        Array.isArray(dataNeg.details),
      `Properly rejected offset=-5 and offset=not_num`
    );
  } catch (e) {
    assert("Detections validation: invalid offset", false, e.message);
  }

  // 13. Validation: invalid enum values
  try {
    const resBadType = await fetch(`${BASE_URL}/api/detections?type=invalid_type_enum`);
    const dataBadType = await resBadType.json();
    const resBadStatus = await fetch(`${BASE_URL}/api/detections?status=repaired`); // not in current schema
    const dataBadStatus = await resBadStatus.json();
    const resBadSev = await fetch(`${BASE_URL}/api/detections?severity=extreme`);
    const dataBadSev = await resBadSev.json();

    assert(
      "Detections validation: unsupported enum values return 400 Bad Request",
      resBadType.status === 400 &&
        resBadStatus.status === 400 &&
        resBadSev.status === 400 &&
        dataBadType.success === false,
      `Rejected invalid type, status (e.g. repaired), and severity enums`
    );
  } catch (e) {
    assert("Detections validation: invalid enum values", false, e.message);
  }

  // 14. Validation: invalid timestamp & time range
  try {
    const resBadDate = await fetch(`${BASE_URL}/api/detections?since=not-a-date`);
    const dataBadDate = await resBadDate.json();
    const resInverted = await fetch(
      `${BASE_URL}/api/detections?since=2026-09-10T00:00:00Z&until=2026-09-01T00:00:00Z`
    );
    const dataInverted = await resInverted.json();

    assert(
      "Detections validation: invalid timestamp and inverted range return 400",
      resBadDate.status === 400 &&
        resInverted.status === 400 &&
        dataBadDate.success === false &&
        dataInverted.success === false,
      `Rejected bad date syntax and inverted since > until`
    );
  } catch (e) {
    assert("Detections validation: invalid timestamp", false, e.message);
  }

  // =========================================================================
  // INCIDENTS TESTS
  // =========================================================================
  console.log("\n>>> Testing Incidents Query Filtering & Pagination <<<");

  // 15. Incidents: bus_id filter
  try {
    const res = await fetch(`${BASE_URL}/api/incidents?bus_id=BUS-DEL-101`);
    const data = await res.json();
    const allMatch = data.data.every((inc) => inc.bus_id === "BUS-DEL-101");
    const containsInc1 = data.data.some((inc) => inc.id === testIncident1.id);
    assert(
      "Incidents: bus_id filter (?bus_id=BUS-DEL-101)",
      res.status === 200 && allMatch && containsInc1,
      `Matched ${data.count} items, all bus BUS-DEL-101`
    );
  } catch (e) {
    assert("Incidents: bus_id filter", false, e.message);
  }

  // 16. Incidents: trigger_reason filter
  try {
    const res = await fetch(`${BASE_URL}/api/incidents?trigger_reason=reckless_overtake`);
    const data = await res.json();
    const allMatch = data.data.every((inc) => inc.trigger_reason === "reckless_overtake");
    const containsInc2 = data.data.some((inc) => inc.id === testIncident2.id);
    assert(
      "Incidents: trigger_reason filter (?trigger_reason=reckless_overtake)",
      res.status === 200 && allMatch && containsInc2,
      `Matched ${data.count} items, trigger_reason=reckless_overtake`
    );
  } catch (e) {
    assert("Incidents: trigger_reason filter", false, e.message);
  }

  // 17. Incidents: since / until time range
  try {
    const res = await fetch(
      `${BASE_URL}/api/incidents?since=2026-09-05T00:00:00Z&until=2026-09-07T00:00:00Z`
    );
    const data = await res.json();
    const hasInc2 = data.data.some((inc) => inc.id === testIncident2.id);
    const hasInc1 = data.data.some((inc) => inc.id === testIncident1.id);
    assert(
      "Incidents: time range filter (since & until)",
      res.status === 200 && hasInc2 && !hasInc1,
      `Matched testIncident2, excluded testIncident1`
    );
  } catch (e) {
    assert("Incidents: time range filter", false, e.message);
  }

  // 18. Incidents: pagination & metadata
  try {
    const res = await fetch(`${BASE_URL}/api/incidents?limit=1&offset=0`);
    const data = await res.json();
    assert(
      "Incidents: pagination limit=1 metadata present",
      res.status === 200 &&
        data.success === true &&
        Array.isArray(data.data) &&
        data.data.length === 1 &&
        data.pagination?.limit === 1 &&
        data.pagination?.offset === 0 &&
        typeof data.pagination?.total === "number",
      `Count: ${data.count}, Total: ${data.pagination?.total}`
    );
  } catch (e) {
    assert("Incidents: pagination metadata", false, e.message);
  }

  // 19. Incidents: invalid parameters
  try {
    const resBad = await fetch(`${BASE_URL}/api/incidents?limit=999`);
    const dataBad = await resBad.json();
    assert(
      "Incidents validation: limit > 200 returns 400 Bad Request",
      resBad.status === 400 && dataBad.success === false,
      `Rejected limit=999`
    );
  } catch (e) {
    assert("Incidents validation: invalid parameters", false, e.message);
  }

  // =========================================================================
  // VEHICLE DENSITY TESTS
  // =========================================================================
  console.log("\n>>> Testing Vehicle Density Query Filtering & Pagination <<<");

  // 20. Vehicle Density: segment_id filter
  try {
    const res = await fetch(`${BASE_URL}/api/vehicle-density?segment_id=SEG-DEL-001`);
    const data = await res.json();
    const allMatch = data.data.every((vd) => vd.segment_id === "SEG-DEL-001");
    const containsVd1 = data.data.some((vd) => vd.id === testDensity1.id);
    assert(
      "Vehicle Density: segment_id filter (?segment_id=SEG-DEL-001)",
      res.status === 200 && allMatch && containsVd1,
      `Matched ${data.count} items on SEG-DEL-001`
    );
  } catch (e) {
    assert("Vehicle Density: segment_id filter", false, e.message);
  }

  // 21. Vehicle Density: since / until time range (recorded_at)
  try {
    const res = await fetch(
      `${BASE_URL}/api/vehicle-density?since=2026-09-06T00:00:00Z&until=2026-09-08T00:00:00Z`
    );
    const data = await res.json();
    const hasVd2 = data.data.some((vd) => vd.id === testDensity2.id);
    const hasVd1 = data.data.some((vd) => vd.id === testDensity1.id);
    assert(
      "Vehicle Density: time range filter on recorded_at (since & until)",
      res.status === 200 && hasVd2 && !hasVd1,
      `Matched testDensity2, excluded testDensity1`
    );
  } catch (e) {
    assert("Vehicle Density: time range filter", false, e.message);
  }

  // 22. Vehicle Density: pagination metadata
  try {
    const res = await fetch(`${BASE_URL}/api/vehicle-density?limit=1&offset=0`);
    const data = await res.json();
    assert(
      "Vehicle Density: pagination metadata present",
      res.status === 200 &&
        data.success === true &&
        Array.isArray(data.data) &&
        data.data.length === 1 &&
        data.pagination?.limit === 1 &&
        typeof data.pagination?.total === "number",
      `Count: ${data.count}, Total: ${data.pagination?.total}`
    );
  } catch (e) {
    assert("Vehicle Density: pagination metadata", false, e.message);
  }

  // 23. Vehicle Density: invalid parameters
  try {
    const resBad = await fetch(`${BASE_URL}/api/vehicle-density?offset=-1`);
    const dataBad = await resBad.json();
    assert(
      "Vehicle Density validation: offset < 0 returns 400 Bad Request",
      resBad.status === 400 && dataBad.success === false,
      `Rejected offset=-1`
    );
  } catch (e) {
    assert("Vehicle Density validation: invalid parameters", false, e.message);
  }

  // Teardown
  await cleanupFixtures();

  console.log("\n==========================================================");
  console.log(`Results: ${passed}/${total} checks passed.`);
  console.log("==========================================================");

  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests();
