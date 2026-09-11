"""
Integration test for Person 4 Traffic Adapter -> Edge Orchestrator -> Node/Express Backend pipeline.

Pipeline flow tested:
REAL STAGE 3/4/5 TRAFFIC OUTPUT
  ↓
TrafficAdapter (ml/traffic/adapter.py)
  ↓
CanonicalVehicleDensity (edge-orchestrator/app/models/vehicle_density.py)
  ↓
EdgeOrchestrator (edge-orchestrator/app/orchestrator/core.py)
  ↓
Node/Express Backend POST /api/vehicle-density
"""

import sys
import os
import json
import time
import requests

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EDGE_ORCHESTRATOR_DIR = os.path.join(REPO_ROOT, "edge-orchestrator")

if EDGE_ORCHESTRATOR_DIR not in sys.path:
    sys.path.insert(0, EDGE_ORCHESTRATOR_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from app.orchestrator.context import EdgeContext
from app.orchestrator.core import orchestrator_core
from ml.traffic.adapter import TrafficAdapter

EDGE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:5000"


def run_traffic_integration_test():
    print("=== Testing Person 4 Traffic Adapter -> Edge Orchestrator -> Backend Pipeline ===\n")
    passed = 0
    total = 0

    # Load verified Stage 3 output
    stage3_path = os.path.join(REPO_ROOT, "ml", "traffic", "sample_output", "counting_result.json")
    with open(stage3_path, "r") as f:
        stage3_data = json.load(f)

    # 1. Register TrafficAdapter
    total += 1
    try:
        traffic_adapter = TrafficAdapter()
        orchestrator_core.register_adapter("vehicle_density", traffic_adapter)
        orchestrator_core.register_adapter("traffic_density", traffic_adapter)
        print("[PASS] 1. TrafficAdapter successfully registered with EdgeOrchestrator")
        passed += 1
    except Exception as e:
        print(f"[FAIL] 1. Failed to register TrafficAdapter: {e}")

    # 2. Process Stage 3 real traffic output through Edge Orchestrator
    total += 1
    t0 = time.perf_counter()
    try:
        res = orchestrator_core.process_and_forward("vehicle_density", stage3_data)
        t1 = time.perf_counter()
        forward_latency_ms = (t1 - t0) * 1000

        if res.get("success") and res.get("data"):
            stored_data = res["data"]
            rec_id = stored_data.get("id")
            count = stored_data.get("vehicle_count")
            breakdown = stored_data.get("class_breakdown")
            print(
                f"[PASS] 2. Real Stage 3 traffic output forwarded via EdgeOrchestrator to Backend "
                f"(Status: 201 Created, Record ID: {rec_id}, Count: {count}, Breakdown: {breakdown}, Latency: {forward_latency_ms:.2f} ms)"
            )
            passed += 1
        else:
            print(f"[FAIL] 2. EdgeOrchestrator forwarding failed: {res}")
    except Exception as e:
        print(f"[FAIL] 2. EdgeOrchestrator pipeline error: {e}")

    # 3. Verify record in Backend GET /api/vehicle-density
    total += 1
    try:
        resp = requests.get(f"{BACKEND_URL}/api/vehicle-density", timeout=3.0)
        data = resp.json()
        matching = [vd for vd in data.get("data", []) if vd.get("vehicle_count") == 72]
        if resp.status_code == 200 and len(matching) > 0:
            record = matching[0]
            print(
                f"[PASS] 3. Backend GET /api/vehicle-density confirmed stored record "
                f"(Count: {record['vehicle_count']}, Classes: {record['class_breakdown']}, Bus ID: {record['bus_id']})"
            )
            passed += 1
        else:
            print(f"[FAIL] 3. Real traffic record not found in backend GET endpoint: {data}")
    except Exception as e:
        print(f"[FAIL] 3. Verification error against backend: {e}")

    # 4. Process Stage 5 flow-enriched real traffic output
    total += 1
    stage5_payload = {
        "vehicle_count": 72,
        "class_breakdown": {"car": 63, "bus": 1, "truck": 8, "motorcycle": 0},
        "segment_id": "SEG-DEL-RING-104",
        "relative_density": {"peak_count": 28, "density_ratio": 0.85},
        "flow_summary": {"down": 18, "right": 11, "left": 2, "up": 0, "unknown": 41},
        "tracker": "ByteTrack",
        "stage": "Stage 5",
    }
    try:
        res = orchestrator_core.process_and_forward("vehicle_density", stage5_payload)
        if res.get("success") and res.get("data"):
            stored_metadata = res["data"].get("metadata", {})
            if "flow_summary" in stored_metadata and stored_metadata["flow_summary"].get("down") == 18:
                print(
                    f"[PASS] 4. Stage 5 flow metadata preserved and stored in Backend "
                    f"(Flow Down: {stored_metadata['flow_summary']['down']})"
                )
                passed += 1
            else:
                print(f"[FAIL] 4. Flow metadata missing or incorrect in backend payload: {stored_metadata}")
        else:
            print(f"[FAIL] 4. Stage 5 payload forwarding failed: {res}")
    except Exception as e:
        print(f"[FAIL] 4. Stage 5 integration error: {e}")

    # 5. Ingest via Edge HTTP Endpoint POST /ingest/vehicle_density
    total += 1
    try:
        resp = requests.post(
            f"{EDGE_URL}/ingest/vehicle_density",
            json=stage3_data,
            timeout=3.0,
        )
        data = resp.json()
        if resp.status_code == 200 and data.get("success") and data.get("forwarded"):
            backend_resp = data.get("backend_response", {})
            print(
                f"[PASS] 5. Edge Server HTTP POST /ingest/vehicle_density succeeded "
                f"(Backend Record ID: {backend_resp.get('data', {}).get('id')})"
            )
            passed += 1
        else:
            print(f"[FAIL] 5. Edge HTTP ingest endpoint failed: {resp.status_code} {data}")
    except Exception as e:
        print(f"[FAIL] 5. Edge HTTP ingest error: {e}")

    print(f"\n===========================================")
    print(f"Results: {passed}/{total} tests passed.")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(run_traffic_integration_test())
