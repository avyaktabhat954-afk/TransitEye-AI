"""
TransitEye VRU Safety AI ModelAdapter Implementation
=====================================================
Normalizes raw VRU perception outputs (pedestrian, cyclist, motorcyclist) into the canonical
TransitEye contract payload (CanonicalDetection). Subclasses edge-orchestrator's
ModelAdapter interface.
"""

import sys
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional, Union

# Ensure edge-orchestrator directory is in sys.path
EDGE_ORCHESTRATOR_DIR = Path(__file__).resolve().parents[2] / "edge-orchestrator"
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.adapters.base import ModelAdapter
from app.models.detection import CanonicalDetection
from app.models.common import LocationModel, SeverityEnum, StatusEnum
from app.orchestrator.context import EdgeContext

# Approved VRU perception classes
VRU_CLASS_ID_MAP = {
    0: "person",
    1: "bicycle",
    3: "motorcycle",
}

APPROVED_VRU_SUBTYPES = {
    "person",
    "pedestrian",
    "bicycle",
    "cyclist",
    "motorcycle",
    "motorcyclist",
    "pedestrian_hazard",
    "vru_in_roadway",
}


class VRUSafetyAdapter(ModelAdapter):
    """
    Production ModelAdapter for Vulnerable Road User (VRU) Safety AI.
    Normalizes raw VRU detection dicts into CanonicalDetection payloads.
    """

    @property
    def domain(self) -> str:
        """Domain category for VRU safety perception is 'detection'."""
        return "detection"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalDetection:
        """
        Normalizes a single raw VRU prediction dictionary into a CanonicalDetection payload.
        Supplements EdgeContext (GPS location, bus_id, UTC timestamp) as needed.
        """
        if not isinstance(raw_output, dict):
            raise TypeError(f"Expected dict for raw_output, got {type(raw_output).__name__}")

        # Subtype / label / class_id extraction
        raw_subtype = (
            raw_output.get("subtype")
            if raw_output.get("subtype") is not None
            else raw_output.get("class_id")
            if raw_output.get("class_id") is not None
            else raw_output.get("class_name") or raw_output.get("label")
        )

        if isinstance(raw_subtype, int) and raw_subtype in VRU_CLASS_ID_MAP:
            subtype = VRU_CLASS_ID_MAP[raw_subtype]
        elif isinstance(raw_subtype, str) and raw_subtype.strip():
            subtype = raw_subtype.strip().lower()
        else:
            subtype = "vru_hazard"

        # Confidence extraction & bounding in [0.0, 1.0]
        raw_conf = raw_output.get("confidence")
        if raw_conf is not None:
            try:
                confidence = max(0.0, min(1.0, float(raw_conf)))
            except (ValueError, TypeError):
                confidence = 0.0
        else:
            confidence = 0.0

        # Severity resolution
        raw_sev = raw_output.get("severity")
        if isinstance(raw_sev, SeverityEnum):
            severity = raw_sev
        elif isinstance(raw_sev, str) and raw_sev.lower() in SeverityEnum.__members__.values():
            severity = SeverityEnum(raw_sev.lower())
        else:
            if confidence >= 0.85:
                severity = SeverityEnum.HIGH
            elif confidence >= 0.60:
                severity = SeverityEnum.MEDIUM
            else:
                severity = SeverityEnum.LOW

        # Location resolution
        loc = raw_output.get("location")
        if isinstance(loc, LocationModel):
            location_model = loc
        elif isinstance(loc, dict):
            location_model = LocationModel(**loc)
        else:
            location_model = context.to_location_model()

        # Metadata resolution
        metadata = {
            "bbox": raw_output.get("bbox"),
            "class_id": raw_output.get("class_id"),
            "proximity_zone": raw_output.get("proximity_zone", "unknown"),
        }
        if isinstance(raw_output.get("metadata"), dict):
            metadata.update(raw_output["metadata"])

        detection_id = raw_output.get("id") or f"det-vru-{uuid.uuid4().hex[:8]}"

        return CanonicalDetection(
            id=detection_id,
            type="vru_safety",
            subtype=subtype,
            confidence=confidence,
            severity=severity,
            location=location_model,
            segment_id=raw_output.get("segment_id"),
            status=StatusEnum(raw_output.get("status", "pending")),
            confirmed_by_count=int(raw_output.get("confirmed_by_count", 1)),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            thumbnail_url=raw_output.get("thumbnail_url"),
            metadata=metadata,
        )

    def normalize_frame(
        self, raw_frame_output: Dict[str, Any], context: EdgeContext
    ) -> List[CanonicalDetection]:
        """
        Normalizes a multi-detection frame dictionary containing a list of VRU detections
        into a list of CanonicalDetection objects. Handles zero detections gracefully.
        """
        detections_list = raw_frame_output.get("detections", [])
        if not detections_list:
            return []

        results = []
        for det in detections_list:
            det_input = dict(det)
            if "location" not in det_input and "location" in raw_frame_output:
                det_input["location"] = raw_frame_output["location"]
            if "segment_id" not in det_input and "segment_id" in raw_frame_output:
                det_input["segment_id"] = raw_frame_output["segment_id"]
            results.append(self.normalize(det_input, context))

        return results
