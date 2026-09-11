from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.common import LocationModel

class CanonicalVehicleDensity(BaseModel):
    id: str = Field(..., description="Unique vehicle density record ID")
    segment_id: Optional[str] = Field(default=None, description="GIS road segment ID")
    vehicle_count: int = Field(..., ge=0, description="Total vehicle count in sampling window")
    class_breakdown: Dict[str, int] = Field(..., description="Counts per vehicle category")
    bus_id: str = Field(..., min_length=1, description="Sensing bus ID")
    recorded_at: str = Field(..., description="ISO 8601 UTC timestamp of aggregation")
    location: Optional[LocationModel] = Field(default=None, description="Optional location telemetry")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Traffic metadata")
