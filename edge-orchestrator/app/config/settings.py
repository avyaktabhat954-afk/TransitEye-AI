import os

class EdgeSettings:
    """Configuration settings for the Edge Orchestrator."""

    def __init__(self):
        self.edge_bus_id: str = os.getenv("EDGE_BUS_ID", "BUS-DEMO-001")
        self.backend_api_url: str = os.getenv("BACKEND_API_URL", "http://localhost:5000").rstrip("/")
        self.port: int = int(os.getenv("EDGE_PORT", "8000"))
        
        # Feature toggles
        self.enable_road_defects: bool = os.getenv("ENABLE_ROAD_DEFECTS", "true").lower() == "true"
        self.enable_anpr: bool = os.getenv("ENABLE_ANPR", "true").lower() == "true"
        self.enable_vehicle_density: bool = os.getenv("ENABLE_VEHICLE_DENSITY", "true").lower() == "true"
        self.enable_vru: bool = os.getenv("ENABLE_VRU", "true").lower() == "true"
        self.enable_waterlogging: bool = os.getenv("ENABLE_WATERLOGGING", "true").lower() == "true"

        # Thresholds
        self.normal_confidence: float = float(os.getenv("EDGE_NORMAL_CONFIDENCE", "0.50"))
        self.alert_confidence: float = float(os.getenv("EDGE_ALERT_CONFIDENCE", "0.70"))
        self.incident_confidence: float = float(os.getenv("EDGE_INCIDENT_CONFIDENCE", "0.85"))

settings = EdgeSettings()
