"""
Person 4 -- Stage 6: Traffic Model Adapter
==========================================

Adapter component for normalizing TransitEye perception traffic outputs (YOLOv8n + ByteTrack)
into the canonical `CanonicalVehicleDensity` contract expected by the Edge Orchestrator and Backend.

Domain: "vehicle_density"
Schema: CanonicalVehicleDensity (Pydantic model)

Approved Classes:
- car
- bus
- truck
- motorcycle

Rule Enforcement:
- NO unauthorized vehicle classes permitted (e.g., auto_rickshaw, person, bicycle).
- Strict invariant enforcement: sum(class_breakdown.values()) == vehicle_count.
- Context fallbacks (bus_id, timestamp, location) provided via EdgeContext.
- NO model inference performed within this adapter (pure normalization layer).
"""

import sys
import os
import uuid
from typing import Any, Dict, Optional

# Ensure edge-orchestrator is in Python path for importing adapter abstractions
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EDGE_ORCHESTRATOR_DIR = os.path.join(REPO_ROOT, "edge-orchestrator")

if EDGE_ORCHESTRATOR_DIR not in sys.path:
    sys.path.insert(0, EDGE_ORCHESTRATOR_DIR)

# Import context first to avoid circular import in app.orchestrator.__init__
from app.orchestrator.context import EdgeContext
from app.adapters.base import ModelAdapter
from app.models.vehicle_density import CanonicalVehicleDensity
from app.models.common import LocationModel

APPROVED_TRAFFIC_CLASSES = {"car", "bus", "truck", "motorcycle"}


class TrafficAdapter(ModelAdapter):
    """
    Model adapter for Person 4 Traffic Perception outputs.
    Normalizes vehicle counting, class breakdown, density, and flow metadata into CanonicalVehicleDensity.
    """

    @property
    def domain(self) -> str:
        return "vehicle_density"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalVehicleDensity:
        """
        Normalizes raw traffic perception output into CanonicalVehicleDensity.

        Parameters
        ----------
        raw_output : dict
            Raw traffic output from Stage 3 counting, Stage 4 density, Stage 5 flow,
            or an ingested dictionary payload.
        context : EdgeContext
            Edge telemetry context (bus_id, timestamp, location).

        Returns
        -------
        CanonicalVehicleDensity
            Canonical contract payload ready for edge forwarding.
        """
        if not isinstance(raw_output, dict):
            raise TypeError(f"TrafficAdapter requires dict input payload, got {type(raw_output)}")

        # 1. Extract vehicle count
        if "vehicle_count" in raw_output:
            vehicle_count = int(raw_output["vehicle_count"])
        elif "unique_tracked_vehicles" in raw_output:
            vehicle_count = int(raw_output["unique_tracked_vehicles"])
        elif "unique_vehicle_count" in raw_output:
            vehicle_count = int(raw_output["unique_vehicle_count"])
        elif "unique_track_summary" in raw_output and "total_unique_tracks" in raw_output["unique_track_summary"]:
            vehicle_count = int(raw_output["unique_track_summary"]["total_unique_tracks"])
        else:
            raise ValueError("Raw traffic payload missing 'vehicle_count' or 'unique_tracked_vehicles'")

        if vehicle_count < 0:
            raise ValueError(f"Vehicle count cannot be negative: {vehicle_count}")

        # 2. Extract and validate class breakdown
        raw_breakdown = (
            raw_output.get("class_breakdown")
            or raw_output.get("unique_vehicle_class_breakdown")
            or raw_output.get("unique_class_breakdown")
            or {}
        )

        # Verify no unauthorized classes exist
        unauthorized = [c for c in raw_breakdown if c not in APPROVED_TRAFFIC_CLASSES]
        if unauthorized:
            raise ValueError(
                f"Unauthorized vehicle class(es) in breakdown: {unauthorized}. "
                f"Only approved classes permitted: {sorted(APPROVED_TRAFFIC_CLASSES)}"
            )

        # Build clean 4-class breakdown dictionary (default 0 for missing approved classes)
        class_breakdown = {cls: int(raw_breakdown.get(cls, 0)) for cls in sorted(APPROVED_TRAFFIC_CLASSES)}

        # 3. Enforce strict invariant: sum(class_breakdown.values()) == vehicle_count
        breakdown_sum = sum(class_breakdown.values())
        if breakdown_sum != vehicle_count:
            raise ValueError(
                f"Class breakdown sum ({breakdown_sum}) does not equal total vehicle_count ({vehicle_count}). "
                f"Breakdown: {class_breakdown}"
            )

        # 4. Context fallbacks for ID, bus_id, timestamp, location
        record_id = raw_output.get("id") or f"vd-traffic-{uuid.uuid4().hex[:8]}"
        segment_id = raw_output.get("segment_id")
        bus_id = raw_output.get("bus_id") or context.bus_id
        recorded_at = raw_output.get("recorded_at") or raw_output.get("timestamp") or context.timestamp

        loc_data = raw_output.get("location")
        if loc_data and isinstance(loc_data, dict):
            location_model = LocationModel(**loc_data)
        else:
            location_model = context.to_location_model()

        # 5. Metadata preservation (Stage 4 density, Stage 5 flow summary, pipeline details)
        metadata = raw_output.get("metadata", {}).copy() if isinstance(raw_output.get("metadata"), dict) else {}

        # Preserve Stage 4 relative density if present
        if "relative_density" in raw_output:
            metadata["relative_density"] = raw_output["relative_density"]

        # Preserve Stage 5 flow summary if present
        if "flow_summary" in raw_output:
            metadata["flow_summary"] = raw_output["flow_summary"]

        if "class_breakdown_by_direction" in raw_output:
            metadata["class_breakdown_by_direction"] = raw_output["class_breakdown_by_direction"]

        if "tracker" in raw_output:
            metadata["tracker"] = raw_output["tracker"]

        if "stage" in raw_output:
            metadata["pipeline_stage"] = raw_output["stage"]

        # Return CanonicalVehicleDensity contract model
        return CanonicalVehicleDensity(
            id=record_id,
            segment_id=segment_id,
            vehicle_count=vehicle_count,
            class_breakdown=class_breakdown,
            bus_id=bus_id,
            recorded_at=recorded_at,
            location=location_model,
            metadata=metadata,
        )
