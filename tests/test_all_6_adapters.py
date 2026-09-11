"""
Unit & Orchestration Test Suite for All 6 TransitEye Perception Capabilities
=============================================================================
Verifies registration, normalization, and context enrichment across all 6 adapters:
1. Road Defects (RoadDefectsAdapter -> CanonicalDetection)
2. Missing Infrastructure (MissingInfrastructureAdapter -> CanonicalDetection)
3. Traffic (TrafficAdapter -> CanonicalVehicleDensity)
4. VRU Safety (VRUSafetyAdapter -> CanonicalDetection)
5. ANPR (ANPRAdapter -> CanonicalIncident)
6. Waterlogging (WaterloggingAdapter -> CanonicalDetection)
"""

import sys
import unittest
from pathlib import Path

# Add project root and edge-orchestrator to path
REPO_ROOT = Path(__file__).resolve().parents[1]
EDGE_ORCHESTRATOR_DIR = REPO_ROOT / "edge-orchestrator"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.orchestrator.context import EdgeContext
from app.orchestrator.core import EdgeOrchestrator
from app.models.detection import CanonicalDetection
from app.models.incident import CanonicalIncident
from app.models.vehicle_density import CanonicalVehicleDensity

# Import production adapters for all 6 capabilities
from ml.road_defects.adapter import RoadDefectsAdapter
from ml.missing_infrastructure.adapter import MissingInfrastructureAdapter
from ml.traffic.adapter import TrafficAdapter
from ml.vru.adapter import VRUSafetyAdapter
from ml.anpr.adapter import ANPRAdapter
from ml.waterlogging.adapter import WaterloggingAdapter


class TestAllSixCapabilitiesOrchestration(unittest.TestCase):

    def setUp(self):
        self.orchestrator = EdgeOrchestrator()
        self.context = EdgeContext(
            bus_id="BUS-DEL-CENTRAL-01",
            latitude=28.6139,
            longitude=77.2090,
            altitude=216.5,
            speed=32.0,
            heading=180.0,
            accuracy=2.0,
            timestamp="2026-09-11T15:00:00Z"
        )
        # Register all 6 adapters
        self.orchestrator.register_adapter("road_defects", RoadDefectsAdapter())
        self.orchestrator.register_adapter("missing_infrastructure", MissingInfrastructureAdapter())
        self.orchestrator.register_adapter("traffic", TrafficAdapter())
        self.orchestrator.register_adapter("vru_safety", VRUSafetyAdapter())
        self.orchestrator.register_adapter("anpr", ANPRAdapter())
        self.orchestrator.register_adapter("waterlogging", WaterloggingAdapter())

    def test_registration_count(self):
        self.assertEqual(len(self.orchestrator._adapters), 6)

    def test_1_road_defects(self):
        adapter = self.orchestrator.get_adapter("road_defects")
        self.assertIsNotNone(adapter)
        raw_input = {"subtype": "pothole", "confidence": 0.88, "bbox": {"x1": 10, "y1": 20, "x2": 50, "y2": 60}}
        result = adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalDetection)
        self.assertEqual(result.type, "road_defect")
        self.assertEqual(result.subtype, "pothole")
        self.assertEqual(result.confidence, 0.88)
        self.assertEqual(result.bus_id, "BUS-DEL-CENTRAL-01")

    def test_2_missing_infrastructure(self):
        adapter = self.orchestrator.get_adapter("missing_infrastructure")
        self.assertIsNotNone(adapter)
        raw_input = {"subtype": "broken_signage", "confidence": 0.91}
        result = adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalDetection)
        self.assertEqual(result.type, "missing_infrastructure")
        self.assertEqual(result.subtype, "broken_signage")
        self.assertEqual(result.confidence, 0.91)
        self.assertEqual(result.bus_id, "BUS-DEL-CENTRAL-01")

    def test_3_traffic(self):
        adapter = self.orchestrator.get_adapter("traffic")
        self.assertIsNotNone(adapter)
        raw_input = {
            "vehicle_count": 15,
            "class_breakdown": {"car": 10, "bus": 2, "truck": 1, "motorcycle": 2},
            "segment_id": "SEG-CP-101"
        }
        result = adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalVehicleDensity)
        self.assertEqual(result.vehicle_count, 15)
        self.assertEqual(result.class_breakdown["car"], 10)
        self.assertEqual(result.bus_id, "BUS-DEL-CENTRAL-01")

    def test_4_vru_safety(self):
        adapter = self.orchestrator.get_adapter("vru_safety")
        self.assertIsNotNone(adapter)
        raw_input = {"subtype": "pedestrian_hazard", "confidence": 0.93}
        result = adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalDetection)
        self.assertEqual(result.type, "vru_safety")
        self.assertEqual(result.subtype, "pedestrian_hazard")
        self.assertEqual(result.confidence, 0.93)
        self.assertEqual(result.bus_id, "BUS-DEL-CENTRAL-01")

    def test_5_anpr(self):
        adapter = self.orchestrator.get_adapter("anpr")
        self.assertIsNotNone(adapter)
        raw_input = {"plate_text": "DL01AB1234", "plate_confidence": 0.97, "trigger_reason": "bus_lane_obstruction"}
        result = adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalIncident)
        self.assertEqual(result.plate_text, "DL01AB1234")
        self.assertEqual(result.plate_confidence, 0.97)
        self.assertEqual(result.bus_id, "BUS-DEL-CENTRAL-01")

    def test_6_waterlogging(self):
        adapter = self.orchestrator.get_adapter("waterlogging")
        self.assertIsNotNone(adapter)
        raw_input = {
            "subtype": "waterlogging",
            "severity": "high",
            "detections": [{"confidence": 0.85}],
            "total_mask_area_ratio": 0.45
        }
        result = adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalDetection)
        self.assertEqual(result.type, "waterlogging")
        self.assertEqual(result.confidence, 0.85)
        self.assertEqual(result.bus_id, "BUS-DEL-CENTRAL-01")


if __name__ == "__main__":
    unittest.main()
