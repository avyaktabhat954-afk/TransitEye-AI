"""
Unit Test Suite for MissingInfrastructureAdapter
==================================================
Verifies normalization of raw Missing Infrastructure outputs into CanonicalDetection.
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
from ml.missing_infrastructure.adapter import MissingInfrastructureAdapter


class TestMissingInfrastructureAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = MissingInfrastructureAdapter()
        self.context = EdgeContext(
            bus_id="BUS-DEL-102",
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

    def test_broken_signage_detection(self):
        raw_input = {
            "subtype": "broken_signage",
            "confidence": 0.89,
            "bbox": {"x1": 100, "y1": 50, "x2": 500, "y2": 600},
            "severity": "medium"
        }
        result = self.adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalDetection)
        self.assertEqual(result.type, "missing_infrastructure")
        self.assertEqual(result.subtype, "broken_signage")
        self.assertEqual(result.confidence, 0.89)
        self.assertEqual(result.bus_id, "BUS-DEL-102")

    def test_broken_pole_detection(self):
        raw_input = {
            "class_name": "broken_pole",
            "confidence": 0.74,
            "severity": "high"
        }
        result = self.adapter.normalize(raw_input, self.context)
        self.assertIsInstance(result, CanonicalDetection)
        self.assertEqual(result.type, "missing_infrastructure")
        self.assertEqual(result.subtype, "broken_pole")
        self.assertEqual(result.confidence, 0.74)
        self.assertEqual(result.severity, SeverityEnum.HIGH)

    def test_severity_determination_fallback(self):
        sev_critical = self.adapter.determine_severity("missing_open_pit", 0.85)
        self.assertEqual(sev_critical, "critical")
        sev_medium = self.adapter.determine_severity("broken_sign", 0.65)
        self.assertEqual(sev_medium, "medium")

    def test_canonical_validation(self):
        raw_input = {
            "subtype": "broken_signage",
            "confidence": 0.95,
            "metadata": {"source": "p3_missing_infra_exp1"}
        }
        canonical = self.adapter.normalize(raw_input, self.context)
        self.assertEqual(canonical.type, "missing_infrastructure")
        json_dump = canonical.model_dump()
        self.assertEqual(json_dump["metadata"]["source"], "p3_missing_infra_exp1")


if __name__ == "__main__":
    unittest.main()
