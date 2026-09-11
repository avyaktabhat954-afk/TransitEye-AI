#!/usr/bin/env python3
"""
TransitEye — Person 3 Missing Infrastructure Model Adapter
Normalizes raw ML detection outputs into canonical TransitEye detection payloads.
"""

import sys
import os
import uuid
from typing import Any, Dict, Optional

# Add project root / edge-orchestrator to path if available for Pydantic schema imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
edge_orchestrator_path = os.path.join(project_root, "edge-orchestrator")
if edge_orchestrator_path not in sys.path:
    sys.path.insert(0, edge_orchestrator_path)

try:
    from pydantic import BaseModel, Field
    PYDANTIC_AVAILABLE = True
except ImportError:
    PYDANTIC_AVAILABLE = False

try:
    from app.adapters.base import ModelAdapter
    from app.models.detection import CanonicalDetection
    from app.models.common import SeverityEnum, StatusEnum, LocationModel
    from app.orchestrator.context import EdgeContext
    EDGE_ORCHESTRATOR_AVAILABLE = True
except ImportError:
    EDGE_ORCHESTRATOR_AVAILABLE = False


class MissingInfrastructureAdapter:
    """
    ModelAdapter implementation for Missing Infrastructure Perception Module.
    Converts raw YOLOv8 detection outputs into canonical TransitEye payloads.
    """

    @property
    def domain(self) -> str:
        return "detection"

    def determine_severity(self, subtype: str, confidence: float) -> str:
        """
        Determines severity heuristic based on infrastructure hazard subtype and confidence.
        """
        subtype_lower = subtype.lower()
        if "manhole" in subtype_lower or "pit" in subtype_lower or "open" in subtype_lower:
            return "critical" if confidence >= 0.75 else "high"
        elif "guardrail" in subtype_lower or "barrier" in subtype_lower:
            return "high" if confidence >= 0.70 else "medium"
        elif "sign" in subtype_lower or "light" in subtype_lower:
            return "medium" if confidence >= 0.60 else "low"
        return "medium"

    def normalize(self, raw_output: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
        """
        Normalizes raw detection dict into a canonical payload structure.
        Supplements bus_id, GPS, and timestamp telemetry from context.
        """
        subtype = raw_output.get("subtype") or raw_output.get("class_name") or "missing_infrastructure"
        confidence = float(raw_output.get("confidence", 0.85))
        severity = raw_output.get("severity") or self.determine_severity(subtype, confidence)

        loc = raw_output.get("location", {})
        if not loc and context and hasattr(context, "to_location_model"):
            location_data = context.to_location_model().model_dump()
        elif not loc and context and hasattr(context, "latitude"):
            location_data = {
                "latitude": getattr(context, "latitude", 0.0),
                "longitude": getattr(context, "longitude", 0.0),
                "heading": getattr(context, "heading", None),
                "speed_mps": getattr(context, "speed_mps", None)
            }
        else:
            location_data = loc or {"latitude": 0.0, "longitude": 0.0}

        bus_id = raw_output.get("bus_id") or (getattr(context, "bus_id", "BUS-UNKNOWN") if context else "BUS-UNKNOWN")
        timestamp = raw_output.get("timestamp") or (getattr(context, "timestamp", "1970-01-01T00:00:00Z") if context else "1970-01-01T00:00:00Z")

        payload = {
            "id": raw_output.get("id") or f"det-mi-{uuid.uuid4().hex[:8]}",
            "type": "missing_infrastructure",
            "subtype": subtype,
            "confidence": round(confidence, 4),
            "severity": severity,
            "location": location_data,
            "segment_id": raw_output.get("segment_id"),
            "status": raw_output.get("status", "pending"),
            "confirmed_by_count": int(raw_output.get("confirmed_by_count", 1)),
            "bus_id": bus_id,
            "timestamp": timestamp,
            "thumbnail_url": raw_output.get("thumbnail_url"),
            "metadata": raw_output.get("metadata", {})
        }

        # If Pydantic CanonicalDetection is available, validate and return payload instance
        if EDGE_ORCHESTRATOR_AVAILABLE:
            try:
                location_model = LocationModel(**location_data)
                return CanonicalDetection(
                    id=payload["id"],
                    type="missing_infrastructure",
                    subtype=payload["subtype"],
                    confidence=payload["confidence"],
                    severity=SeverityEnum(payload["severity"]),
                    location=location_model,
                    segment_id=payload["segment_id"],
                    status=StatusEnum(payload["status"]),
                    confirmed_by_count=payload["confirmed_by_count"],
                    bus_id=payload["bus_id"],
                    timestamp=payload["timestamp"],
                    thumbnail_url=payload["thumbnail_url"],
                    metadata=payload["metadata"]
                )
            except Exception:
                pass

        return payload


if __name__ == "__main__":
    adapter = MissingInfrastructureAdapter()
    sample_raw = {"class_name": "missing_manhole_cover", "confidence": 0.88}
    normalized = adapter.normalize(sample_raw)
    print("Normalized Payload Output:")
    print(normalized)
