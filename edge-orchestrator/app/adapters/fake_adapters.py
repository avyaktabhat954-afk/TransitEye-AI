import uuid
from typing import Any, Dict
from app.adapters.base import ModelAdapter
from app.models.detection import CanonicalDetection
from app.models.incident import CanonicalIncident
from app.models.vehicle_density import CanonicalVehicleDensity
from app.models.common import SeverityEnum, StatusEnum, LocationModel
from app.orchestrator.context import EdgeContext

class RoadDefectAdapter(ModelAdapter):
    """Adapter for road defect perception models (potholes, cracks)."""

    @property
    def domain(self) -> str:
        return "detection"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalDetection:
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        return CanonicalDetection(
            id=raw_output.get("id") or f"det-rd-{uuid.uuid4().hex[:8]}",
            type="road_defect",
            subtype=raw_output.get("subtype", "pothole"),
            confidence=float(raw_output.get("confidence", 0.90)),
            severity=SeverityEnum(raw_output.get("severity", "high")),
            location=location_model,
            segment_id=raw_output.get("segment_id", "SEG-DEL-RING-104"),
            status=StatusEnum(raw_output.get("status", "pending")),
            confirmed_by_count=int(raw_output.get("confirmed_by_count", 1)),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            thumbnail_url=raw_output.get("thumbnail_url"),
            metadata=raw_output.get("metadata", {}),
        )

FakeRoadDefectAdapter = RoadDefectAdapter


class WaterloggingAdapter(ModelAdapter):
    """Adapter for waterlogging and flood detection models."""

    @property
    def domain(self) -> str:
        return "detection"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalDetection:
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        return CanonicalDetection(
            id=raw_output.get("id") or f"det-wl-{uuid.uuid4().hex[:8]}",
            type="waterlogging",
            subtype=raw_output.get("subtype", "deep_standing_water"),
            confidence=float(raw_output.get("confidence", 0.88)),
            severity=SeverityEnum(raw_output.get("severity", "medium")),
            location=location_model,
            segment_id=raw_output.get("segment_id", "SEG-DEL-RING-104"),
            status=StatusEnum(raw_output.get("status", "pending")),
            confirmed_by_count=int(raw_output.get("confirmed_by_count", 1)),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            thumbnail_url=raw_output.get("thumbnail_url"),
            metadata=raw_output.get("metadata", {}),
        )

FakeWaterloggingAdapter = WaterloggingAdapter


class VRUAdapter(ModelAdapter):
    """Adapter for Vulnerable Road User (pedestrian, cyclist) safety hazards."""

    @property
    def domain(self) -> str:
        return "detection"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalDetection:
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        return CanonicalDetection(
            id=raw_output.get("id") or f"det-vru-{uuid.uuid4().hex[:8]}",
            type="vru_safety",
            subtype=raw_output.get("subtype", "pedestrian_hazard"),
            confidence=float(raw_output.get("confidence", 0.92)),
            severity=SeverityEnum(raw_output.get("severity", "high")),
            location=location_model,
            segment_id=raw_output.get("segment_id", "SEG-DEL-RING-104"),
            status=StatusEnum(raw_output.get("status", "pending")),
            confirmed_by_count=int(raw_output.get("confirmed_by_count", 1)),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            thumbnail_url=raw_output.get("thumbnail_url"),
            metadata=raw_output.get("metadata", {}),
        )

FakeVRUAdapter = VRUAdapter


class ANPRAdapter(ModelAdapter):
    """Adapter for ANPR & traffic violation incidents."""

    @property
    def domain(self) -> str:
        return "incident"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalIncident:
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        return CanonicalIncident(
            id=raw_output.get("id") or f"inc-{uuid.uuid4().hex[:8]}",
            plate_text=str(raw_output.get("plate_text", "DL01AB1234")).upper(),
            plate_confidence=float(raw_output.get("plate_confidence", 0.95)),
            trigger_reason=str(raw_output.get("trigger_reason", "bus_lane_obstruction")),
            location=location_model,
            clip_url=raw_output.get("clip_url"),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            timestamp=raw_output.get("timestamp") or context.timestamp,
            metadata=raw_output.get("metadata", {}),
        )

FakeIncidentAdapter = ANPRAdapter


class TrafficDensityAdapter(ModelAdapter):
    """Adapter for vehicle counting and traffic density models."""

    @property
    def domain(self) -> str:
        return "vehicle_density"

    def normalize(self, raw_output: Dict[str, Any], context: EdgeContext) -> CanonicalVehicleDensity:
        loc = raw_output.get("location")
        location_model = LocationModel(**loc) if loc else context.to_location_model()

        return CanonicalVehicleDensity(
            id=raw_output.get("id") or f"vd-{uuid.uuid4().hex[:8]}",
            segment_id=raw_output.get("segment_id", "SEG-DEL-RING-104"),
            vehicle_count=int(raw_output.get("vehicle_count", 25)),
            class_breakdown=raw_output.get("class_breakdown", {"car": 15, "bus": 2, "motorcycle": 8}),
            bus_id=raw_output.get("bus_id") or context.bus_id,
            recorded_at=raw_output.get("recorded_at") or context.timestamp,
            location=location_model,
            metadata=raw_output.get("metadata", {}),
        )

FakeVehicleDensityAdapter = TrafficDensityAdapter
