from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field

class SeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class StatusEnum(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"

class LocationModel(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude")
    altitude: Optional[float] = Field(default=None, description="Altitude in meters")
    speed: Optional[float] = Field(default=None, ge=0.0, description="Speed in km/h")
    heading: Optional[float] = Field(default=None, ge=0.0, le=360.0, description="Heading degrees")
    accuracy: Optional[float] = Field(default=None, ge=0.0, description="Accuracy in meters")
