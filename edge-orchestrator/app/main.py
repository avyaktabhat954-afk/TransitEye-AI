from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Body

from app.config.settings import settings
from app.orchestrator.core import orchestrator_core

# Import production ModelAdapters for all 6 AI capabilities
from ml.road_defects.adapter import RoadDefectsAdapter
from ml.missing_infrastructure.adapter import MissingInfrastructureAdapter
from ml.traffic.adapter import TrafficAdapter
from ml.vru.adapter import VRUSafetyAdapter
from ml.anpr.adapter import ANPRAdapter
from ml.waterlogging.adapter import WaterloggingAdapter

# Initialize FastAPI application
app = FastAPI(
    title="TransitEye Edge Orchestrator",
    description="Edge intelligence coordinator and multi-model perception gateway",
    version="1.0.0",
)

# Instantiate production adapters
road_defects_adapter = RoadDefectsAdapter()
missing_infra_adapter = MissingInfrastructureAdapter()
traffic_adapter = TrafficAdapter()
vru_safety_adapter = VRUSafetyAdapter()
anpr_adapter = ANPRAdapter()
waterlogging_adapter = WaterloggingAdapter()

# Register adapters for all six perception capabilities and backward-compatible route aliases
orchestrator_core.register_adapter("road_defects", road_defects_adapter)
orchestrator_core.register_adapter("road_defect", road_defects_adapter)

orchestrator_core.register_adapter("missing_infrastructure", missing_infra_adapter)
orchestrator_core.register_adapter("missing_infra", missing_infra_adapter)

orchestrator_core.register_adapter("traffic", traffic_adapter)
orchestrator_core.register_adapter("traffic_density", traffic_adapter)
orchestrator_core.register_adapter("vehicle_density", traffic_adapter)

orchestrator_core.register_adapter("vru_safety", vru_safety_adapter)
orchestrator_core.register_adapter("vru", vru_safety_adapter)

orchestrator_core.register_adapter("anpr", anpr_adapter)
orchestrator_core.register_adapter("incident", anpr_adapter)

orchestrator_core.register_adapter("waterlogging", waterlogging_adapter)


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
        "registered_adapters": list(orchestrator_core._adapters.keys()),
        "timestamp": now_iso,
    }


@app.post("/ingest/{adapter_name}")
def ingest_observation(adapter_name: str, payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Ingests raw perception output, runs normalization through the registered adapter,
    and forwards the canonical contract payload to the central backend.
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
