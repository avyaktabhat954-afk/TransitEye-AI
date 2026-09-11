"""
Unit Test Suite for VRUSafetyAdapter
====================================
Verifies normalization of raw VRU Safety perception outputs into CanonicalDetection.
"""

import sys
import unittest
from pathlib import Path

# Add project root and edge-orchestrator to path
REPO_ROOT = Path(__file__).resolve().parents[2]
EDGE_ORCHESTRATOR_DIR = REPO_ROOT / "edge-orchestrator"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.orchestrator.context import EdgeContext
from app.models.detection import CanonicalDetection
from app.models.common import SeverityEnum
from ml.vru.adapter import VRUSafetyAdapter


class TestVRUSafetyAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = VRUSafetyAdapter()
        self.context = EdgeContext(
            bus_id="BUS-DEL-103",
            latitude=28.6139,
            longitude=77.2090,
            altitude=216.5,
            speed=34.0,
            heading=175.0,
            accuracy=2.1,
            timestamp="2026-09-11T12:00:00Z"
        )

    def test_domain_property(self):
        self.assertEqual(self.adapter.domain, "detection")

    def test_single_vru_detections(self):
        vru_cases = ["person", "bicycle", "motorcycle", "pedestrian_hazard"]
        for subtype in vru_cases:
            raw_input = {
                "subtype": subtype,
                "confidence": 0.92,
                "bbox": {"x1": 50, "y1": 100, "x2": 150, "y2": 300},
                "severity": "high"
            }
            canonical = self.adapter.normalize(raw_input, self.context)
            self.assertIsInstance(canonical, CanonicalDetection)
            self.assertEqual(canonical.type, "vru_safety")
            self.assertEqual(canonical.subtype, subtype)
            self.assertEqual(canonical.confidence, 0.92)
            self.assertEqual(canonical.severity, SeverityEnum.HIGH)
            self.assertEqual(canonical.bus_id, "BUS-DEL-103")

    def test_class_id_mapping(self):
        class_id_cases = [(0, "person"), (1, "bicycle"), (3, "motorcycle")]
        for class_id, expected_name in class_id_cases:
            raw_input = {"class_id": class_id, "confidence": 0.81}
            canonical = self.adapter.normalize(raw_input, self.context)
            self.assertEqual(canonical.subtype, expected_name)

    def test_multiple_detections_frame(self):
        raw_frame = {
            "segment_id": "SEG-CP-202",
            "detections": [
                {"class_id": 0, "confidence": 0.94, "bbox": {"x1": 10, "y1": 10, "x2": 50, "y2": 120}},
                {"class_id": 1, "confidence": 0.78, "bbox": {"x1": 60, "y1": 30, "x2": 110, "y2": 90}},
            ]
        }
        canonicals = self.adapter.normalize_frame(raw_frame, self.context)
        self.assertEqual(len(canonicals), 2)
        self.assertEqual(canonicals[0].subtype, "person")
        self.assertEqual(canonicals[0].segment_id, "SEG-CP-202")
        self.assertEqual(canonicals[1].subtype, "bicycle")

    def test_zero_detections(self):
        raw_frame = {"detections": []}
        canonicals = self.adapter.normalize_frame(raw_frame, self.context)
        self.assertEqual(canonicals, [])

    def test_malformed_input_type_error(self):
        with self.assertRaises(TypeError):
            self.adapter.normalize("invalid_string", self.context)


if __name__ == "__main__":
    unittest.main()
