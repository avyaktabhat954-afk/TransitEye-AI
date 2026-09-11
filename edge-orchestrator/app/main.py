from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Body
from app.config.settings import settings
from app.orchestrator.core import orchestrator_core
from app.adapters.fake_adapters import (
    RoadDefectAdapter,
    VRUAdapter,
    ANPRAdapter,
    TrafficDensityAdapter,
)

from ml.waterlogging.adapter import WaterloggingAdapter

# Initialize FastAPI application
app = FastAPI(
    title="TransitEye Edge Orchestrator",
    description="Edge intelligence coordinator and model ingestion gateway",
    version="1.0.0",
)

# Register default perception adapters
orchestrator_core.register_adapter("road_defect", RoadDefectAdapter())
orchestrator_core.register_adapter("detection", RoadDefectAdapter())
orchestrator_core.register_adapter("waterlogging", WaterloggingAdapter())
orchestrator_core.register_adapter("vru_safety", VRUAdapter())
orchestrator_core.register_adapter("incident", ANPRAdapter())
orchestrator_core.register_adapter("anpr", ANPRAdapter())
orchestrator_core.register_adapter("vehicle_density", TrafficDensityAdapter())
orchestrator_core.register_adapter("traffic_density", TrafficDensityAdapter())


@app.get("/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint for the Edge Orchestrator service."""
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "success": True,
        "service": "TransitEye Edge Orchestrator",
        "status": "healthy",
        "bus_id": settings.edge_bus_id,
        "backend_url": settings.backend_api_url,
        "timestamp": now_iso,
    }

@app.post("/ingest/{adapter_name}")
def ingest_observation(adapter_name: str, payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Ingests raw perception output, runs normalization through the registered adapter,
    and forwards the canonical contract to the central backend.
    """
    try:
        backend_resp = orchestrator_core.process_and_forward(adapter_name, payload)
        return {
            "success": True,
            "forwarded": True,
            "adapter": adapter_name,
            "backend_response": backend_resp,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)
