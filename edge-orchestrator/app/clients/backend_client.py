import requests
from typing import Dict, Any, Optional
from app.config.settings import settings
from app.models.detection import CanonicalDetection
from app.models.incident import CanonicalIncident
from app.models.vehicle_density import CanonicalVehicleDensity

class BackendClient:
    """HTTP Client for dispatching validated edge observations to Node/Express backend."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 5.0):
        self.base_url = (base_url or settings.backend_api_url).rstrip("/")
        self.timeout = timeout

    def check_health(self) -> Dict[str, Any]:
        """Checks backend health status."""
        url = f"{self.base_url}/api/health"
        resp = requests.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json()

    def send_detection(self, detection: CanonicalDetection) -> Dict[str, Any]:
        """Posts canonical detection to POST /api/detections."""
        url = f"{self.base_url}/api/detections"
        payload = detection.model_dump(mode="json")
        resp = requests.post(url, json=payload, timeout=self.timeout)
        if resp.status_code >= 400:
            raise RuntimeError(f"Backend rejected detection ({resp.status_code}): {resp.text}")
        return resp.json()

    def send_incident(self, incident: CanonicalIncident) -> Dict[str, Any]:
        """Posts canonical incident to POST /api/incidents."""
        url = f"{self.base_url}/api/incidents"
        payload = incident.model_dump(mode="json")
        resp = requests.post(url, json=payload, timeout=self.timeout)
        if resp.status_code >= 400:
            raise RuntimeError(f"Backend rejected incident ({resp.status_code}): {resp.text}")
        return resp.json()

    def send_vehicle_density(self, density: CanonicalVehicleDensity) -> Dict[str, Any]:
        """Posts canonical vehicle density to POST /api/vehicle-density."""
        url = f"{self.base_url}/api/vehicle-density"
        payload = density.model_dump(mode="json")
        resp = requests.post(url, json=payload, timeout=self.timeout)
        if resp.status_code >= 400:
            raise RuntimeError(f"Backend rejected vehicle density ({resp.status_code}): {resp.text}")
        return resp.json()

default_backend_client = BackendClient()
