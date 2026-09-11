"""
TransitEye ANPR ModelAdapter Implementation
============================================
Normalizes raw ANPR inference output into the canonical TransitEye contract payload (CanonicalIncident).
Subclasses edge-orchestrator's ModelAdapter interface.
"""

import sys
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

# Add edge-orchestrator directory to python sys.path if not already present
EDGE_ORCHESTRATOR_DIR = Path(__file__).resolve().parents[2] / "edge-orchestrator"
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.adapters.base import ModelAdapter
from app.models.incident import CanonicalIncident
from app.models.common import LocationModel
from app.orchestrator.context import EdgeContext

class ANPRAdapter(ModelAdapter):
    """
    Production ANPR perception adapter.
    Normalizes 2-stage ANPR raw inference outputs into CanonicalIncident events.
    """

    @property
    def domain(self) -> str:
        """Domain category for ANPR & traffic violations is 'incident'."""
        return "incident"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalIncident:
        """
        Normalizes raw ANPR output into CanonicalIncident contract.
        Supplements onboard EdgeContext (GPS location, bus_id, UTC timestamp) as needed.
        """
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        raw_plate = raw_output.get("plate_text")
        if raw_plate and str(raw_plate).strip():
            plate_text = str(raw_plate).strip().upper()
        else:
            plate_text = "UNKNOWN"

        raw_conf = raw_output.get("plate_confidence")
        if raw_conf is not None:
            try:
                conf_val = float(raw_conf)
                plate_confidence = max(0.0, min(1.0, conf_val))
            except (ValueError, TypeError):
                plate_confidence = 0.0
        else:
            plate_confidence = 0.0

        if plate_text == "UNKNOWN":
            plate_confidence = 0.0

        # Construct metadata dictionary preserving raw inference attributes
        meta = {
            "bbox": raw_output.get("bbox"),
            "padded_bbox": raw_output.get("padded_bbox"),
            "raw_ocr_text": raw_output.get("raw_ocr_text"),
            "detector_confidence": raw_output.get("detector_confidence"),
            "ocr_confidence": raw_output.get("ocr_confidence"),
            "crop_padding_pct": raw_output.get("crop_padding_pct", 0.05),
        }
        if isinstance(raw_output.get("metadata"), dict):
            meta.update(raw_output["metadata"])

        return CanonicalIncident(
            id=raw_output.get("id") or f"inc-{uuid.uuid4().hex[:8]}",
            plate_text=plate_text,
            plate_confidence=plate_confidence,
            trigger_reason=str(raw_output.get("trigger_reason", "bus_lane_obstruction")),
            location=location_model,
            clip_url=raw_output.get("clip_url"),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            metadata=meta,
        )
