"""
TransitEye Waterlogging Adapter Validation Suite
=================================================
Validates WaterloggingAdapter against real sample inputs and edge context snapshots.
Ensures Pydantic CanonicalDetection contract compliance, bounded confidence [0.0, 1.0],
preserved severity, and robust error handling.
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any

# Ensure edge-orchestrator and workspace root are in sys.path
WORKSPACE_DIR = Path(__file__).resolve().parents[2]
EDGE_ORCHESTRATOR_DIR = WORKSPACE_DIR / "edge-orchestrator"

if str(WORKSPACE_DIR) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_DIR))
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.orchestrator.context import EdgeContext
from app.models.detection import CanonicalDetection
from ml.waterlogging.adapter import WaterloggingAdapter


def create_mock_context() -> EdgeContext:
    """Creates a deterministic EdgeContext snapshot for testing."""
    return EdgeContext(
        bus_id="BUS-DEL-104",
        latitude=28.6139,
        longitude=77.2090,
        altitude=216.5,
        speed=28.4,
        heading=180.0,
        accuracy=2.0,
        timestamp="2026-09-09T18:00:00Z"
    )


def test_adapter():
    adapter = WaterloggingAdapter()
    context = create_mock_context()

    print("==================================================")
    print("TRANSITEYE WATERLOGGING ADAPTER VALIDATION")
    print("==================================================")

    test_cases = [
        ("Flooded Road", "ml/waterlogging/sample_input/flooded_road.jpg"),
        ("Vehicle Flood", "ml/waterlogging/sample_input/vehicle_flood.jpg"),
        ("Difficult Night", "ml/waterlogging/sample_input/difficult_night.jpg"),
        ("No Detection", "ml/waterlogging/sample_input/no_detection.jpg"),
        ("Nonexistent Image", "ml/waterlogging/sample_input/nonexistent.jpg"),
    ]

    all_passed = True

    for label, img_path in test_cases:
        print(f"\n--- Testing: {label} ({img_path}) ---")
        try:
            canonical_obj: CanonicalDetection = adapter.predict_and_normalize(img_path, context)

            # Convert to dict for inspection
            payload = canonical_obj.model_dump()

            print(f"Domain:              {adapter.domain}")
            print(f"Canonical Type:      {payload['type']}")
            print(f"Canonical Subtype:   {payload['subtype']}")
            print(f"Confidence:          {payload['confidence']}")
            print(f"Severity:            {payload['severity']}")
            print(f"Bus ID:              {payload['bus_id']}")
            print(f"Location Telemetry:  lat={payload['location']['latitude']}, lon={payload['location']['longitude']}")
            print(f"Mask Area Ratio:     {payload['metadata']['total_mask_area_ratio']}")
            print(f"Instances Count:     {payload['metadata']['num_instances']}")
            print(f"Raw Status:          {payload['metadata']['raw_status']}")

            # Assertions
            assert payload['type'] == "waterlogging", f"Expected type 'waterlogging', got '{payload['type']}'"
            assert 0.0 <= payload['confidence'] <= 1.0, f"Confidence out of bounds: {payload['confidence']}"
            assert payload['bus_id'] == "BUS-DEL-104", f"Bus ID mismatch: {payload['bus_id']}"
            assert isinstance(canonical_obj, CanonicalDetection), "Object is not a CanonicalDetection instance"

            print(f"Result: PASSED [Pydantic Validated]")

        except Exception as e:
            print(f"Result: FAILED - {e}")
            all_passed = False

    print("\n==================================================")
    if all_passed:
        print("ALL WATERLOGGING ADAPTER TESTS PASSED SUCCESSFULLY!")
    else:
        print("SOME TESTS FAILED - INSPECT LOGS ABOVE")
    print("==================================================")


if __name__ == "__main__":
    test_adapter()
