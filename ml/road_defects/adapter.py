"""
TransitEye Road Defects ModelAdapter Implementation
====================================================
Normalizes raw Road Defect perception outputs (YOLOv8n 4-class) into the canonical
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

# Four target road defect classes
APPROVED_ROAD_DEFECT_CLASSES = {
    "longitudinal_crack",
    "transverse_crack",
    "alligator_crack",
    "pothole",
}

CLASS_ID_MAP = {
    0: "longitudinal_crack",
    1: "transverse_crack",
    2: "alligator_crack",
    3: "pothole",
}


class RoadDefectsAdapter(ModelAdapter):
    """
    Production ModelAdapter for Road Defect Detection.
    Normalizes raw YOLOv8n road defect inference dicts into CanonicalDetection payloads.
    """

    @property
    def domain(self) -> str:
        """Domain category for road surface defect perception is 'detection'."""
        return "detection"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalDetection:
        """
        Normalizes a single raw road defect prediction dict into a CanonicalDetection payload.
        Supplements EdgeContext (GPS location, bus_id, UTC timestamp) as needed.
        """
        if not isinstance(raw_output, dict):
            raise TypeError(f"Expected dict for raw_output, got {type(raw_output).__name__}")

        # Extract subtype / label / class_id
        raw_subtype = (
            raw_output.get("subtype")
            if raw_output.get("subtype") is not None
            else raw_output.get("class_id")
            if raw_output.get("class_id") is not None
            else raw_output.get("class_name") or raw_output.get("label")
        )

        if isinstance(raw_subtype, int) and raw_subtype in CLASS_ID_MAP:
            subtype = CLASS_ID_MAP[raw_subtype]
        elif isinstance(raw_subtype, str) and raw_subtype in APPROVED_ROAD_DEFECT_CLASSES:
            subtype = raw_subtype
        elif isinstance(raw_subtype, str) and raw_subtype.strip():
            subtype = raw_subtype.strip().lower()
        else:
            subtype = "unclassified_defect"

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
            # Derive default severity based on confidence
            if confidence >= 0.8:
                severity = SeverityEnum.HIGH
            elif confidence >= 0.5:
                severity = SeverityEnum.MEDIUM
            else:
                severity = SeverityEnum.LOW

        # Location telemetry resolution
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
            "img_shape": raw_output.get("img_shape"),
        }
        if isinstance(raw_output.get("metadata"), dict):
            metadata.update(raw_output["metadata"])

        detection_id = raw_output.get("id") or f"det-rd-{uuid.uuid4().hex[:8]}"

        return CanonicalDetection(
            id=detection_id,
            type="road_defect",
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
        Normalizes a multi-detection frame dictionary containing a list of detections
        into a list of CanonicalDetection objects. Handles zero detections gracefully.
        """
        detections_list = raw_frame_output.get("detections", [])
        if not detections_list:
            return []

        results = []
        for det in detections_list:
            # Inherit frame-level metadata if available
            det_input = dict(det)
            if "location" not in det_input and "location" in raw_frame_output:
                det_input["location"] = raw_frame_output["location"]
            if "segment_id" not in det_input and "segment_id" in raw_frame_output:
                det_input["segment_id"] = raw_frame_output["segment_id"]
            results.append(self.normalize(det_input, context))

        return results
