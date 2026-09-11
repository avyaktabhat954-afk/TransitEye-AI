"""
Unit Test Suite for ANPRAdapter
===============================
Verifies normalization of raw ANPR / license plate outputs into CanonicalIncident.
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
from app.models.incident import CanonicalIncident
from ml.anpr.adapter import ANPRAdapter


class TestANPRAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = ANPRAdapter()
        self.context = EdgeContext(
            bus_id="BUS-DEL-105",
            latitude=28.6139,
            longitude=77.2090,
            altitude=216.5,
            speed=34.0,
            heading=175.0,
            accuracy=2.1,
            timestamp="2026-09-11T12:00:00Z"
        )

    def test_domain_property(self):
        self.assertEqual(self.adapter.domain, "incident")

    def test_anpr_valid_plate(self):
        raw_input = {
            "plate_text": "dl09xy1234",
            "plate_confidence": 0.96,
            "trigger_reason": "bus_lane_obstruction",
            "bbox": [10, 20, 100, 50]
        }
        canonical = self.adapter.normalize(raw_input, self.context)
        self.assertIsInstance(canonical, CanonicalIncident)
        self.assertEqual(canonical.plate_text, "DL09XY1234")
        self.assertEqual(canonical.plate_confidence, 0.96)
        self.assertEqual(canonical.trigger_reason, "bus_lane_obstruction")
        self.assertEqual(canonical.bus_id, "BUS-DEL-105")

    def test_anpr_unknown_plate_fallback(self):
        raw_input = {
            "plate_text": "",
            "plate_confidence": 0.50
        }
        canonical = self.adapter.normalize(raw_input, self.context)
        self.assertEqual(canonical.plate_text, "UNKNOWN")
        self.assertEqual(canonical.plate_confidence, 0.0)

    def test_anpr_canonical_json_serialization(self):
        raw_input = {
            "plate_text": "HR26AB9999",
            "plate_confidence": 0.91,
            "clip_url": "https://storage.transiteye.city/clips/inc1.mp4"
        }
        canonical = self.adapter.normalize(raw_input, self.context)
        json_dump = canonical.model_dump()
        self.assertEqual(json_dump["plate_text"], "HR26AB9999")
        self.assertEqual(json_dump["clip_url"], "https://storage.transiteye.city/clips/inc1.mp4")


if __name__ == "__main__":
    unittest.main()
