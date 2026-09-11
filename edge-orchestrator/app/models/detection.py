from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.common import LocationModel, SeverityEnum, StatusEnum

class CanonicalDetection(BaseModel):
    id: str = Field(..., description="Unique detection identifier")
    type: str = Field(..., description="Domain category: road_defect, waterlogging, vru_safety")
    subtype: str = Field(..., min_length=1, description="Specific defect/hazard label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score")
    severity: SeverityEnum = Field(..., description="Severity level")
    location: LocationModel = Field(..., description="WGS84 location telemetry")
    segment_id: Optional[str] = Field(default=None, description="GIS road segment ID")
    status: StatusEnum = Field(default=StatusEnum.PENDING, description="Lifecycle status")
    confirmed_by_count: int = Field(default=1, ge=1, description="Confirmation pass count")
    bus_id: str = Field(..., min_length=1, description="Sensing bus ID")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    thumbnail_url: Optional[str] = Field(default=None, description="Evidence image URI")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Stream-specific metadata")
