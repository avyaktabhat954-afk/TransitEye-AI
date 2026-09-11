"""
End-to-end integration test for the TransitEye Edge Orchestrator Skeleton.
Simulates AI model outputs, runs normalization through adapters,
attaches edge context, and verifies ingestion into the running Node/Express backend.
"""

import sys
import os
import requests

# Add edge-orchestrator to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "edge-orchestrator"))

from app.orchestrator.core import orchestrator_core
from app.adapters.fake_adapters import (
    FakeRoadDefectAdapter,
    FakeIncidentAdapter,
    FakeVehicleDensityAdapter,
)

EDGE_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:5000"

def run_tests():
    print("=== Testing TransitEye Edge Orchestrator Pipeline ===\n")
    passed = 0
    total = 0

    # 1. Edge health check
    total += 1
    try:
        resp = requests.get(f"{EDGE_URL}/health", timeout=3.0)
        data = resp.json()
        if resp.status_code == 200 and data.get("status") == "healthy":
            print(f"[PASS] 1. Edge Orchestrator /health returned 200 OK (Bus: {data.get('bus_id')})")
            passed += 1
        else:
            print(f"[FAIL] 1. Edge Orchestrator health returned: {resp.status_code} {data}")
    except Exception as e:
        print(f"[FAIL] 1. Edge Orchestrator health error: {e}")

    # 2. Backend health check
    total += 1
    try:
        resp = requests.get(f"{BACKEND_URL}/api/health", timeout=3.0)
        data = resp.json()
        if resp.status_code == 200 and data.get("status") == "healthy":
            print(f"[PASS] 2. Node Backend /api/health returned 200 OK")
            passed += 1
        else:
            print(f"[FAIL] 2. Backend health returned: {resp.status_code} {data}")
    except Exception as e:
        print(f"[FAIL] 2. Backend health error: {e}")

    # 3. Pipeline: Fake Road Defect -> Edge Orchestrator -> Backend /api/detections
    total += 1
    raw_defect = {
        "subtype": "severe_pothole",
        "confidence": 0.94,
        "severity": "critical",
        "metadata": {"depth_cm": 11.2, "source": "synthetic_camera_feed"},
    }
    try:
        # Register adapter
        orchestrator_core.register_adapter("road_defect", FakeRoadDefectAdapter())
        result = orchestrator_core.process_and_forward("road_defect", raw_defect)
        if result.get("success") and result.get("data"):
            det_id = result["data"]["id"]
            print(f"[PASS] 3. Fake Road Defect forwarded to Backend (Status: 201 Created, ID: {det_id})")
            passed += 1
        else:
            print(f"[FAIL] 3. Failed to forward road defect: {result}")
    except Exception as e:
        print(f"[FAIL] 3. Road defect pipeline error: {e}")

    # 4. Pipeline: Fake Incident -> Edge Orchestrator -> Backend /api/incidents
    total += 1
    raw_incident = {
        "plate_text": "DL09XY9999",
        "plate_confidence": 0.97,
        "trigger_reason": "reckless_overtake_near_stop",
        "clip_url": "https://storage.transiteye.city/clips/inc_fake_9999.mp4",
        "metadata": {"source_sensor": "front_telephoto"},
    }
    try:
        orchestrator_core.register_adapter("incident", FakeIncidentAdapter())
        result = orchestrator_core.process_and_forward("incident", raw_incident)
        if result.get("success") and result.get("data"):
            inc_id = result["data"]["id"]
            print(f"[PASS] 4. Fake Incident forwarded to Backend (Status: 201 Created, ID: {inc_id})")
            passed += 1
        else:
            print(f"[FAIL] 4. Failed to forward incident: {result}")
    except Exception as e:
        print(f"[FAIL] 4. Incident pipeline error: {e}")

    # 5. Pipeline: Fake Vehicle Density -> Edge Orchestrator -> Backend /api/vehicle-density
    total += 1
    raw_density = {
        "vehicle_count": 42,
        "class_breakdown": {"car": 24, "bus": 4, "motorcycle": 10, "auto_rickshaw": 4},
        "segment_id": "SEG-DEL-CP-005",
        "metadata": {"fps": 30, "tracked_tracks": 42},
    }
    try:
        orchestrator_core.register_adapter("vehicle_density", FakeVehicleDensityAdapter())
        result = orchestrator_core.process_and_forward("vehicle_density", raw_density)
        if result.get("success") and result.get("data"):
            vd_id = result["data"]["id"]
            print(f"[PASS] 5. Fake Vehicle Density forwarded to Backend (Status: 201 Created, ID: {vd_id})")
            passed += 1
        else:
            print(f"[FAIL] 5. Failed to forward vehicle density: {result}")
    except Exception as e:
        print(f"[FAIL] 5. Vehicle density pipeline error: {e}")

    # 6. Verify Backend GET /api/detections contains the edge-dispatched detection
    total += 1
    try:
        resp = requests.get(f"{BACKEND_URL}/api/detections", timeout=3.0)
        data = resp.json()
        matching = [d for d in data.get("data", []) if d.get("subtype") == "severe_pothole"]
        if resp.status_code == 200 and len(matching) > 0:
            print(f"[PASS] 6. Backend /api/detections confirmed stored record (Bus: {matching[0]['bus_id']})")
            passed += 1
        else:
            print(f"[FAIL] 6. Edge detection not found in backend: {data}")
    except Exception as e:
        print(f"[FAIL] 6. Verification error for detections: {e}")

    # 7. Verify Backend GET /api/incidents contains the edge-dispatched incident
    total += 1
    try:
        resp = requests.get(f"{BACKEND_URL}/api/incidents", timeout=3.0)
        data = resp.json()
        matching = [inc for inc in data.get("data", []) if inc.get("plate_text") == "DL09XY9999"]
        if resp.status_code == 200 and len(matching) > 0:
            print(f"[PASS] 7. Backend /api/incidents confirmed stored record (Plate: {matching[0]['plate_text']})")
            passed += 1
        else:
            print(f"[FAIL] 7. Edge incident not found in backend: {data}")
    except Exception as e:
        print(f"[FAIL] 7. Verification error for incidents: {e}")

    # 8. Verify Backend GET /api/vehicle-density contains the edge-dispatched record
    total += 1
    try:
        resp = requests.get(f"{BACKEND_URL}/api/vehicle-density", timeout=3.0)
        data = resp.json()
        matching = [vd for vd in data.get("data", []) if vd.get("vehicle_count") == 42]
        if resp.status_code == 200 and len(matching) > 0:
            print(f"[PASS] 8. Backend /api/vehicle-density confirmed stored record (Count: {matching[0]['vehicle_count']})")
            passed += 1
        else:
            print(f"[FAIL] 8. Edge density record not found in backend: {data}")
    except Exception as e:
        print(f"[FAIL] 8. Verification error for vehicle density: {e}")

    # 9. Pipeline: Fake Waterlogging -> Edge Orchestrator -> Backend /api/detections
    total += 1
    raw_waterlogging = {
        "subtype": "deep_standing_water",
        "confidence": 0.89,
        "severity": "medium",
        "metadata": {"water_depth_est_cm": 15.0},
    }
    try:
        from app.adapters.fake_adapters import WaterloggingAdapter
        orchestrator_core.register_adapter("waterlogging", WaterloggingAdapter())
        result = orchestrator_core.process_and_forward("waterlogging", raw_waterlogging)
        if result.get("success") and result.get("data") and result["data"].get("type") == "waterlogging":
            print(f"[PASS] 9. Waterlogging Detection forwarded to Backend (ID: {result['data']['id']})")
            passed += 1
        else:
            print(f"[FAIL] 9. Failed to forward waterlogging detection: {result}")
    except Exception as e:
        print(f"[FAIL] 9. Waterlogging pipeline error: {e}")

    # 10. Pipeline: Fake VRU -> Edge Orchestrator -> Backend /api/detections
    total += 1
    raw_vru = {
        "subtype": "pedestrian_hazard",
        "confidence": 0.93,
        "severity": "high",
        "metadata": {"cluster_size": 3},
    }
    try:
        from app.adapters.fake_adapters import VRUAdapter
        orchestrator_core.register_adapter("vru_safety", VRUAdapter())
        result = orchestrator_core.process_and_forward("vru_safety", raw_vru)
        if result.get("success") and result.get("data") and result["data"].get("type") == "vru_safety":
            print(f"[PASS] 10. VRU Safety Observation forwarded to Backend (ID: {result['data']['id']})")
            passed += 1
        else:
            print(f"[FAIL] 10. Failed to forward VRU observation: {result}")
    except Exception as e:
        print(f"[FAIL] 10. VRU pipeline error: {e}")

    # 11. Edge HTTP Ingest Endpoint: POST /ingest/road_defect
    total += 1
    try:
        resp = requests.post(
            f"{EDGE_URL}/ingest/road_defect",
            json={"subtype": "edge_http_pothole", "confidence": 0.91, "severity": "high"},
            timeout=3.0,
        )
        data = resp.json()
        if resp.status_code == 200 and data.get("success") and data.get("forwarded"):
            print(f"[PASS] 11. Edge Server POST /ingest/road_defect succeeded (Backend ID: {data['backend_response']['data']['id']})")
            passed += 1
        else:
            print(f"[FAIL] 11. Edge Server /ingest failed: {resp.status_code} {data}")
    except Exception as e:
        print(f"[FAIL] 11. Edge HTTP Ingest error: {e}")

    print(f"\n===========================================")
    print(f"Results: {passed}/{total} tests passed.")
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    run_tests()

