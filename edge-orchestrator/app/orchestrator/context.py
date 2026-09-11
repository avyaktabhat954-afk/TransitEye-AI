from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from app.models.common import LocationModel
from app.config.settings import settings

class EdgeContext(BaseModel):
    """Snapshot of current bus telemetry and temporal state."""
    bus_id: str
    latitude: float
    longitude: float
    altitude: Optional[float] = 216.0
    speed: Optional[float] = 32.5
    heading: Optional[float] = 180.0
    accuracy: Optional[float] = 2.0
    timestamp: str

    def to_location_model(self) -> LocationModel:
        return LocationModel(
            latitude=self.latitude,
            longitude=self.longitude,
            altitude=self.altitude,
            speed=self.speed,
            heading=self.heading,
            accuracy=self.accuracy,
        )

class ContextProvider:
    """Abstract interface for hardware telemetry / GPS / IMU providers."""
    def get_current_context(self) -> EdgeContext:
        raise NotImplementedError

class MockContextProvider(ContextProvider):
    """Deterministic mock provider simulating onboard GPS / bus state."""
    def __init__(self, bus_id: Optional[str] = None):
        self.bus_id = bus_id or settings.edge_bus_id
        # Central Delhi reference point
        self.lat = 28.6139
        self.lon = 77.2090

    def get_current_context(self) -> EdgeContext:
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return EdgeContext(
            bus_id=self.bus_id,
            latitude=self.lat,
            longitude=self.lon,
            altitude=216.5,
            speed=34.0,
            heading=175.0,
            accuracy=2.1,
            timestamp=now_iso,
        )

default_context_provider = MockContextProvider()
