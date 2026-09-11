from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.common import LocationModel

class CanonicalIncident(BaseModel):
    id: str = Field(..., description="Unique incident identifier")
    plate_text: str = Field(..., min_length=1, description="License plate characters")
    plate_confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence score")
    trigger_reason: str = Field(..., min_length=1, description="Violation or safety trigger")
    location: LocationModel = Field(..., description="WGS84 location telemetry")
    clip_url: Optional[str] = Field(default=None, description="Evidence video clip URI")
    bus_id: str = Field(..., min_length=1, description="Sensing bus ID")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context metadata")
