"""
TransitEye Waterlogging ModelAdapter Implementation
===================================================
Normalizes raw Waterlogging inference output into the canonical TransitEye contract payload (CanonicalDetection).
Subclasses edge-orchestrator's ModelAdapter interface.
"""

import sys
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Union
import numpy as np

# Ensure edge-orchestrator directory is in sys.path
EDGE_ORCHESTRATOR_DIR = Path(__file__).resolve().parents[2] / "edge-orchestrator"
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.adapters.base import ModelAdapter
from app.models.detection import CanonicalDetection
from app.models.common import LocationModel, SeverityEnum, StatusEnum
from app.orchestrator.context import EdgeContext

from ml.waterlogging.inference import WaterloggingDetector


class WaterloggingAdapter(ModelAdapter):
    """
    Production Waterlogging ModelAdapter for TransitEye.
    Normalizes WaterloggingDetector segmentation inference output into CanonicalDetection payloads.
    """

    def __init__(
        self,
        weights_path: Optional[Union[str, Path]] = None,
        conf_threshold: float = 0.25,
        detector: Optional[WaterloggingDetector] = None
    ):
        if detector is not None:
            self.detector = detector
        else:
            self.detector = WaterloggingDetector(weights_path=weights_path, conf_threshold=conf_threshold)

    @property
    def domain(self) -> str:
        """Domain category for waterlogging hazard detection is 'detection'."""
        return "detection"

    def predict_and_normalize(
        self,
        image_input: Union[str, Path, np.ndarray],
        context: EdgeContext,
        location: Optional[Dict[str, Any]] = None,
        segment_id: Optional[str] = None
    ) -> CanonicalDetection:
        """
        Runs WaterloggingDetector inference on input image and normalizes result into CanonicalDetection payload.
        """
        raw_output = self.detector.predict(image_input)
        if location:
            raw_output["location"] = location
        if segment_id:
            raw_output["segment_id"] = segment_id
        return self.normalize(raw_output, context)

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalDetection:
        """
        Normalizes raw waterlogging inference dictionary into CanonicalDetection contract payload.
        Supplements EdgeContext (GPS location, bus_id, UTC timestamp) as needed.
        """
        # Location telemetry resolution
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        # Confidence extraction & bounding in [0.0, 1.0]
        detections = raw_output.get("detections", [])
        if detections:
            conf_list = [d.get("confidence", 0.0) for d in detections if d.get("confidence") is not None]
            max_conf = max(conf_list) if conf_list else 0.0
            confidence = max(0.0, min(1.0, float(max_conf)))
        else:
            confidence = 0.0

        # Severity mapping to SeverityEnum
        raw_sev = str(raw_output.get("severity", "low")).lower()
        if raw_sev == "high":
            severity = SeverityEnum.HIGH
        elif raw_sev == "medium":
            severity = SeverityEnum.MEDIUM
        elif raw_sev == "critical":
            severity = SeverityEnum.CRITICAL
        else:
            severity = SeverityEnum.LOW

        # Metadata dictionary preserving full perception telemetry
        metadata = {
            "total_mask_area_ratio": raw_output.get("total_mask_area_ratio", 0.0),
            "detections": detections,
            "num_instances": len(detections),
            "raw_status": raw_output.get("metadata", {}).get("status", "unknown")
        }
        if isinstance(raw_output.get("metadata"), dict):
            metadata["raw_metadata"] = raw_output["metadata"]

        detection_id = raw_output.get("id") or f"det-wl-{uuid.uuid4().hex[:8]}"
        subtype = raw_output.get("subtype", "waterlogging")

        # Construct and validate CanonicalDetection payload
        return CanonicalDetection(
            id=detection_id,
            type="waterlogging",
            subtype=subtype,
            confidence=confidence,
            severity=severity,
            location=location_model,
            segment_id=raw_output.get("segment_id", "SEG-DEL-RING-104"),
            status=StatusEnum(raw_output.get("status", "pending")),
            confirmed_by_count=int(raw_output.get("confirmed_by_count", 1)),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            thumbnail_url=raw_output.get("thumbnail_url"),
            metadata=metadata
        )
