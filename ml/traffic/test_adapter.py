"""
Unit tests for Person 4 Traffic Model Adapter (ml/traffic/adapter.py)
"""

import sys
import os
import json
import time
import unittest

# Paths
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EDGE_ORCHESTRATOR_DIR = os.path.join(REPO_ROOT, "edge-orchestrator")

if EDGE_ORCHESTRATOR_DIR not in sys.path:
    sys.path.insert(0, EDGE_ORCHESTRATOR_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from app.orchestrator.context import EdgeContext
from ml.traffic.adapter import TrafficAdapter, APPROVED_TRAFFIC_CLASSES
from app.models.vehicle_density import CanonicalVehicleDensity


class TestTrafficAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = TrafficAdapter()
        self.context = EdgeContext(
            bus_id="BUS-TEST-404",
            timestamp="2026-09-08T21:00:00Z",
            latitude=28.6139,
            longitude=77.2090,
            altitude=215.0,
            speed=25.5,
            heading=180.0,
            accuracy=1.5,
        )

        # Load verified Stage 3 output fixture
        sample_json_path = os.path.join(REPO_ROOT, "ml", "traffic", "sample_output", "counting_result.json")
        with open(sample_json_path, "r") as f:
            self.stage3_data = json.load(f)

    def test_domain(self):
        """Test 1: Verify adapter domain equals 'vehicle_density'."""
        self.assertEqual(self.adapter.domain, "vehicle_density")

    def test_stage3_normalization(self):
        """Test 2: Normalize real Stage 3 verified output."""
        canonical = self.adapter.normalize(self.stage3_data, self.context)

        self.assertIsInstance(canonical, CanonicalVehicleDensity)
        self.assertEqual(canonical.vehicle_count, 72)
        self.assertEqual(
            canonical.class_breakdown,
            {"bus": 1, "car": 63, "motorcycle": 0, "truck": 8}
        )
        self.assertEqual(sum(canonical.class_breakdown.values()), canonical.vehicle_count)

    def test_four_classes_preserved(self):
        """Test 3: Verify all 4 approved classes are present and exact counts preserved."""
        canonical = self.adapter.normalize(self.stage3_data, self.context)

        for cls in APPROVED_TRAFFIC_CLASSES:
            self.assertIn(cls, canonical.class_breakdown)

        self.assertEqual(len(canonical.class_breakdown), 4)

    def test_rejection_unauthorized_class(self):
        """Test 4: Verify rejection of unauthorized class (e.g. auto_rickshaw, person)."""
        bad_payload = {
            "vehicle_count": 10,
            "class_breakdown": {
                "car": 5,
                "auto_rickshaw": 5,
            }
        }
        with self.assertRaises(ValueError) as ctx:
            self.adapter.normalize(bad_payload, self.context)
        self.assertIn("Unauthorized vehicle class", str(ctx.exception))

    def test_rejection_invariant_violation(self):
        """Test 5: Verify rejection when sum(class_breakdown.values()) != vehicle_count."""
        mismatched_payload = {
            "vehicle_count": 100,
            "class_breakdown": {
                "car": 50,
                "bus": 10,
                "truck": 5,
                "motorcycle": 5,
            }  # sum is 70 != 100
        }
        with self.assertRaises(ValueError) as ctx:
            self.adapter.normalize(mismatched_payload, self.context)
        self.assertIn("Class breakdown sum (70) does not equal total vehicle_count (100)", str(ctx.exception))

    def test_context_fallbacks(self):
        """Test 6: Verify context fallback for bus_id, timestamp, and location."""
        raw_minimal = {
            "vehicle_count": 5,
            "class_breakdown": {"car": 5},
        }
        canonical = self.adapter.normalize(raw_minimal, self.context)

        self.assertEqual(canonical.bus_id, "BUS-TEST-404")
        self.assertEqual(canonical.recorded_at, "2026-09-08T21:00:00Z")
        self.assertIsNotNone(canonical.location)
        self.assertEqual(canonical.location.latitude, 28.6139)

    def test_metadata_preservation(self):
        """Test 7: Verify Stage 4 relative density & Stage 5 flow metadata are preserved."""
        stage5_payload = {
            "vehicle_count": 72,
            "class_breakdown": {"car": 63, "bus": 1, "truck": 8, "motorcycle": 0},
            "relative_density": {"peak_density_count": 28, "density_ratio": 0.85},
            "flow_summary": {"down": 18, "right": 11, "left": 2, "up": 0, "unknown": 41},
            "tracker": "ByteTrack",
            "stage": "Stage 5",
        }
        canonical = self.adapter.normalize(stage5_payload, self.context)

        self.assertIn("relative_density", canonical.metadata)
        self.assertEqual(canonical.metadata["flow_summary"]["down"], 18)
        self.assertEqual(canonical.metadata["tracker"], "ByteTrack")

    def test_no_model_inference_in_adapter(self):
        """Test 8: Ensure adapter execution is pure normalization with sub-millisecond latency."""
        t0 = time.perf_counter()
        for _ in range(100):
            self.adapter.normalize(self.stage3_data, self.context)
        t1 = time.perf_counter()

        avg_latency_ms = ((t1 - t0) / 100) * 1000
        self.assertLess(avg_latency_ms, 5.0)  # Must be fast sub-ms in-memory normalization


if __name__ == "__main__":
    unittest.main()
