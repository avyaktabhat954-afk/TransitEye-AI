"""
Unit Test Suite for RoadDefectsAdapter
=======================================
Verifies normalization of raw Road Defect perception outputs into CanonicalDetection.
"""

import sys
import unittest
from pathlib import Path

# Add edge-orchestrator and repository root to sys.path
REPO_ROOT = Path(__file__).resolve().parents[2]
EDGE_ORCHESTRATOR_DIR = REPO_ROOT / "edge-orchestrator"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.orchestrator.context import EdgeContext
from app.models.detection import CanonicalDetection
from app.models.common import SeverityEnum, StatusEnum, LocationModel
from ml.road_defects.adapter import RoadDefectsAdapter, APPROVED_ROAD_DEFECT_CLASSES


class TestRoadDefectsAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = RoadDefectsAdapter()
        self.context = EdgeContext(
            bus_id="BUS-DEL-101",
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

    def test_single_detection_all_subclasses(self):
        subclasses = ["longitudinal_crack", "transverse_crack", "alligator_crack", "pothole"]
        for sub in subclasses:
            raw_input = {
                "subtype": sub,
                "confidence": 0.85,
                "bbox": {"x1": 10.0, "y1": 20.0, "x2": 100.0, "y2": 150.0},
                "severity": "high"
            }
            canonical = self.adapter.normalize(raw_input, self.context)
            self.assertIsInstance(canonical, CanonicalDetection)
            self.assertEqual(canonical.type, "road_defect")
            self.assertEqual(canonical.subtype, sub)
            self.assertEqual(canonical.confidence, 0.85)
            self.assertEqual(canonical.severity, SeverityEnum.HIGH)
            self.assertEqual(canonical.bus_id, "BUS-DEL-101")
            self.assertEqual(canonical.timestamp, "2026-09-11T12:00:00Z")
            self.assertEqual(canonical.location.latitude, 28.6139)
            self.assertEqual(canonical.location.longitude, 77.2090)
            self.assertEqual(canonical.metadata["bbox"], {"x1": 10.0, "y1": 20.0, "x2": 100.0, "y2": 150.0})

    def test_class_id_mapping(self):
        class_id_cases = [
            (0, "longitudinal_crack"),
            (1, "transverse_crack"),
            (2, "alligator_crack"),
            (3, "pothole"),
        ]
        for class_id, expected_name in class_id_cases:
            raw_input = {"class_id": class_id, "confidence": 0.75}
            canonical = self.adapter.normalize(raw_input, self.context)
            self.assertEqual(canonical.subtype, expected_name)

    def test_confidence_bounding(self):
        cases = [
            (1.5, 1.0),
            (-0.2, 0.0),
            (0.42, 0.42),
            ("0.9", 0.9),
            (None, 0.0)
        ]
        for conf_in, conf_expected in cases:
            raw_input = {"subtype": "pothole", "confidence": conf_in}
            canonical = self.adapter.normalize(raw_input, self.context)
            self.assertAlmostEqual(canonical.confidence, conf_expected)

    def test_multiple_detections_frame(self):
        raw_frame = {
            "segment_id": "SEG-101",
            "detections": [
                {"subtype": "pothole", "confidence": 0.91, "bbox": {"x1": 5, "y1": 5, "x2": 50, "y2": 50}},
                {"subtype": "alligator_crack", "confidence": 0.64, "bbox": {"x1": 60, "y1": 60, "x2": 120, "y2": 120}},
            ]
        }
        canonicals = self.adapter.normalize_frame(raw_frame, self.context)
        self.assertEqual(len(canonicals), 2)
        self.assertEqual(canonicals[0].subtype, "pothole")
        self.assertEqual(canonicals[0].segment_id, "SEG-101")
        self.assertEqual(canonicals[1].subtype, "alligator_crack")

    def test_zero_detections(self):
        raw_frame = {"detections": []}
        canonicals = self.adapter.normalize_frame(raw_frame, self.context)
        self.assertEqual(canonicals, [])

    def test_malformed_input_type_error(self):
        with self.assertRaises(TypeError):
            self.adapter.normalize("invalid_string_input", self.context)

    def test_canonical_json_serialization(self):
        raw_input = {"subtype": "pothole", "confidence": 0.88}
        canonical = self.adapter.normalize(raw_input, self.context)
        json_dict = canonical.model_dump()
        self.assertEqual(json_dict["type"], "road_defect")
        self.assertEqual(json_dict["subtype"], "pothole")
        self.assertEqual(json_dict["confidence"], 0.88)


if __name__ == "__main__":
    unittest.main()
