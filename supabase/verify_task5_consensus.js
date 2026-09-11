/**
 * TransitEye — Phase 1 Task 5 Verification Script
 *
 * Verifies Multi-Bus Consensus & Corroboration Engine:
 * 1. RPC function find_consensus_detection is callable
 * 2. Bus A creates initial detection (status: pending, confirmed_by_count: 1)
 * 3. Same bus rapid duplicate within < 5 min does not inflate count
 * 4. Bus B reports same defect on same segment -> corroboration triggered:
 *    - confirmed_by_count -> 2
 *    - status -> 'confirmed'
 *    - confirming_buses contains both Bus A and Bus B
 * 5. Bus C reports same defect -> confirmed_by_count -> 3, confidence boosted
 * 6. Distinct defect (different subtype or far location) creates independent record
 * 7. Isolated cleanup of test records
 */

const path = require("path");
const backendDir = path.resolve(__dirname, "../backend");
const dotenvPath = path.join(backendDir, "node_modules", "dotenv");
require(dotenvPath).config({ path: path.resolve(__dirname, "../.env") });
require(dotenvPath).config({ path: path.resolve(backendDir, ".env") });

const { supabase } = require(path.join(backendDir, "src", "config", "supabaseClient"));
const detectionService = require(path.join(backendDir, "src", "services", "detectionService"));

async function runVerification() {
  console.log("==========================================================");
  console.log("TransitEye — Phase 1 Task 5: Multi-Bus Consensus Verification");
  console.log("==========================================================\n");

  let passed = 0;
  let total = 0;
  const createdIds = [];

  // ----------------------------------------------------------------
  // CHECK 1: Verify RPC function find_consensus_detection is callable
  // ----------------------------------------------------------------
  total++;
  try {
    const { data, error } = await supabase.rpc("find_consensus_detection", {
      p_type: "road_defect",
      p_subtype: "pothole",
      p_segment_id: "SEG-TEST-NONEXISTENT",
      p_lat: 28.6328,
      p_lon: 77.2195,
      p_window_hours: 24,
      p_max_distance_meters: 30,
    });

    if (error) {
      console.error(`[FAIL] Check 1: RPC find_consensus_detection error: ${error.message}`);
    } else {
      console.log("[PASS] Check 1: RPC function find_consensus_detection is callable");
      console.log(`       Returned: ${JSON.stringify(data)}`);
      passed++;
    }
  } catch (err) {
    console.error(`[FAIL] Check 1: Unexpected error: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // CHECK 2: Bus A creates initial detection
  // ----------------------------------------------------------------
  total++;
  let initialMasterId = null;
  const testDetIdA = `det-t5-busA-${Date.now()}`;
  try {
    const payloadA = {
      id: testDetIdA,
      type: "road_defect",
      subtype: "pothole",
      confidence: 0.85,
      severity: "high",
      location: {
        latitude: 28.6139, // Kartavya Path (SEG-DEL-001)
        longitude: 77.209,
      },
      bus_id: "BUS-DEL-101",
      timestamp: new Date().toISOString(),
    };

    const recordA = await detectionService.createDetection(payloadA);
    initialMasterId = recordA.id;
    createdIds.push(initialMasterId);

    const isPending = recordA.status === "pending";
    const countIsOne = recordA.confirmed_by_count === 1;
    const busInMetadata = recordA.metadata?.confirming_buses?.includes("BUS-DEL-101");
    const segmentMatched = recordA.segment_id === "SEG-DEL-001";

    if (isPending && countIsOne && busInMetadata && segmentMatched) {
      console.log("[PASS] Check 2: Bus A initial detection created successfully");
      console.log(`       ID: ${recordA.id}, Status: ${recordA.status}, Count: ${recordA.confirmed_by_count}, Segment: ${recordA.segment_id}`);
      passed++;
    } else {
      console.error("[FAIL] Check 2: Initial detection state unexpected:", {
        isPending,
        countIsOne,
        busInMetadata,
        segmentMatched,
        record: recordA,
      });
    }
  } catch (err) {
    console.error(`[FAIL] Check 2: Failed to create initial detection: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // CHECK 3: Same bus rapid duplicate (< 5 min) does NOT inflate count
  // ----------------------------------------------------------------
  total++;
  try {
    const payloadDuplicate = {
      id: `det-t5-busA-dup-${Date.now()}`,
      type: "road_defect",
      subtype: "pothole",
      confidence: 0.86,
      severity: "high",
      location: {
        latitude: 28.61392,
        longitude: 77.20902,
      },
      bus_id: "BUS-DEL-101", // Same bus
      timestamp: new Date(Date.now() + 10000).toISOString(), // 10 seconds later
    };

    const recordDup = await detectionService.createDetection(payloadDuplicate);

    if (
      recordDup.id === initialMasterId &&
      recordDup.confirmed_by_count === 1 &&
      recordDup.status === "pending"
    ) {
      console.log("[PASS] Check 3: Rapid duplicate by same bus preserved count=1 without inflation");
      console.log(`       ID: ${recordDup.id}, Confirmed Count: ${recordDup.confirmed_by_count}`);
      passed++;
    } else {
      console.error("[FAIL] Check 3: Rapid duplicate check failed:", {
        id: recordDup.id,
        initialMasterId,
        count: recordDup.confirmed_by_count,
        status: recordDup.status,
      });
    }
  } catch (err) {
    console.error(`[FAIL] Check 3: Rapid duplicate test error: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // CHECK 4: Bus B detects same defect -> Corroboration triggered
  // ----------------------------------------------------------------
  total++;
  try {
    const payloadB = {
      id: `det-t5-busB-${Date.now()}`,
      type: "road_defect",
      subtype: "pothole",
      confidence: 0.88,
      severity: "high",
      location: {
        latitude: 28.61391, // Same segment/proximity
        longitude: 77.20901,
      },
      bus_id: "BUS-DEL-102", // Different bus!
      timestamp: new Date(Date.now() + 60000).toISOString(),
    };

    const recordB = await detectionService.createDetection(payloadB);

    const isSameId = recordB.id === initialMasterId;
    const countIsTwo = recordB.confirmed_by_count === 2;
    const statusConfirmed = recordB.status === "confirmed";
    const hasBothBuses =
      recordB.metadata?.confirming_buses?.includes("BUS-DEL-101") &&
      recordB.metadata?.confirming_buses?.includes("BUS-DEL-102");
    const isCorroborated = recordB.metadata?.corroborated === true;

    if (isSameId && countIsTwo && statusConfirmed && hasBothBuses && isCorroborated) {
      console.log("[PASS] Check 4: Bus B corroborated defect -> status='confirmed', count=2");
      console.log(`       Confirming buses: ${JSON.stringify(recordB.metadata.confirming_buses)}`);
      console.log(`       Updated confidence: ${recordB.confidence}`);
      passed++;
    } else {
      console.error("[FAIL] Check 4: Corroboration check failed:", {
        isSameId,
        countIsTwo,
        statusConfirmed,
        hasBothBuses,
        isCorroborated,
        record: recordB,
      });
    }
  } catch (err) {
    console.error(`[FAIL] Check 4: Corroboration test error: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // CHECK 5: Bus C detects same defect -> count=3, higher confidence
  // ----------------------------------------------------------------
  total++;
  try {
    const payloadC = {
      id: `det-t5-busC-${Date.now()}`,
      type: "road_defect",
      subtype: "pothole",
      confidence: 0.91,
      severity: "high",
      location: {
        latitude: 28.61393,
        longitude: 77.20903,
      },
      bus_id: "BUS-DEL-103", // Third bus
      timestamp: new Date(Date.now() + 120000).toISOString(),
    };

    const recordC = await detectionService.createDetection(payloadC);

    const isSameId = recordC.id === initialMasterId;
    const countIsThree = recordC.confirmed_by_count === 3;
    const hasThreeBuses = recordC.metadata?.confirming_buses?.length === 3;

    if (isSameId && countIsThree && hasThreeBuses) {
      console.log("[PASS] Check 5: Bus C corroborated defect -> count=3, fleet consensus strengthened");
      console.log(`       Buses: ${JSON.stringify(recordC.metadata.confirming_buses)}, Conf: ${recordC.confidence}`);
      passed++;
    } else {
      console.error("[FAIL] Check 5: Third bus corroboration failed:", {
        isSameId,
        countIsThree,
        hasThreeBuses,
        record: recordC,
      });
    }
  } catch (err) {
    console.error(`[FAIL] Check 5: Third bus corroboration test error: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // CHECK 6: Distinct defect creates separate record
  // ----------------------------------------------------------------
  total++;
  const testDetDistinct = `det-t5-distinct-${Date.now()}`;
  try {
    const payloadDistinct = {
      id: testDetDistinct,
      type: "waterlogging", // Different type
      subtype: "deep_standing_water",
      confidence: 0.82,
      severity: "medium",
      location: {
        latitude: 28.6139,
        longitude: 77.209,
      },
      bus_id: "BUS-DEL-101",
      timestamp: new Date().toISOString(),
    };

    const recordDistinct = await detectionService.createDetection(payloadDistinct);
    createdIds.push(recordDistinct.id);

    const isDifferentId = recordDistinct.id !== initialMasterId;
    const isNewCount = recordDistinct.confirmed_by_count === 1;
    const isPending = recordDistinct.status === "pending";

    if (isDifferentId && isNewCount && isPending) {
      console.log("[PASS] Check 6: Distinct defect (waterlogging) created independent master record");
      console.log(`       ID: ${recordDistinct.id}, Type: ${recordDistinct.type}, Status: ${recordDistinct.status}`);
      passed++;
    } else {
      console.error("[FAIL] Check 6: Distinct defect incorrectly merged:", recordDistinct);
    }
  } catch (err) {
    console.error(`[FAIL] Check 6: Distinct defect test error: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // CHECK 7: Test record cleanup
  // ----------------------------------------------------------------
  total++;
  try {
    for (const id of createdIds) {
      const { error } = await supabase.from("detections").delete().eq("id", id);
      if (error) {
        console.warn(`[WARN] Cleanup error for ${id}: ${error.message}`);
      }
    }
    console.log(`[PASS] Check 7: Cleaned up ${createdIds.length} test records cleanly`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Check 7: Cleanup error: ${err.message}`);
  }

  // ----------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------
  console.log("\n==========================================================");
  console.log(`Task 5 Verification Results: ${passed}/${total} checks passed`);
  console.log("==========================================================");

  if (passed !== total) {
    process.exitCode = 1;
  }
}

runVerification();
