import logging
from typing import Dict, Any, Optional
from app.adapters.base import ModelAdapter
from app.orchestrator.context import ContextProvider, default_context_provider
from app.clients.backend_client import BackendClient, default_backend_client
from app.models.detection import CanonicalDetection
from app.models.incident import CanonicalIncident
from app.models.vehicle_density import CanonicalVehicleDensity

logger = logging.getLogger("edge_orchestrator")

class EdgeOrchestrator:
    """
    Core Edge Orchestrator.
    Manages model adapters, coordinates edge context (GPS/time), validates
    canonical contracts, and dispatches observations to the backend.
    """

    def __init__(
        self,
        context_provider: Optional[ContextProvider] = None,
        backend_client: Optional[BackendClient] = None,
    ):
        self.context_provider = context_provider or default_context_provider
        self.backend_client = backend_client or default_backend_client
        self._adapters: Dict[str, ModelAdapter] = {}

    def register_adapter(self, name: str, adapter: ModelAdapter) -> None:
        """Registers a model adapter for a specific perception stream."""
        self._adapters[name] = adapter
        logger.info(f"Registered model adapter: {name} -> domain: {adapter.domain}")

    def get_adapter(self, name: str) -> Optional[ModelAdapter]:
        return self._adapters.get(name)

    def process_and_forward(self, adapter_name: str, raw_output: Any) -> Dict[str, Any]:
        """
        Processes raw model output through its adapter, enriches with edge context,
        and forwards to the appropriate backend REST endpoint.
        """
        adapter = self._adapters.get(adapter_name)
        if not adapter:
            raise ValueError(f"No adapter registered with name: '{adapter_name}'")

        # 1. Capture current edge context (bus telemetry, GPS, time)
        context = self.context_provider.get_current_context()

        # 2. Normalize raw output into canonical contract payload
        canonical_model = adapter.normalize(raw_output, context)

        # 3. Attach edge metadata when missing
        if hasattr(canonical_model, "bus_id") and not canonical_model.bus_id:
            canonical_model.bus_id = context.bus_id
        if hasattr(canonical_model, "timestamp") and not canonical_model.timestamp:
            canonical_model.timestamp = context.timestamp
        if hasattr(canonical_model, "recorded_at") and not canonical_model.recorded_at:
            canonical_model.recorded_at = context.timestamp
        if hasattr(canonical_model, "location") and canonical_model.location is None:
            canonical_model.location = context.to_location_model()

        # 4. Forward to backend according to domain contract
        if isinstance(canonical_model, CanonicalDetection):
            return self.backend_client.send_detection(canonical_model)
        elif isinstance(canonical_model, CanonicalIncident):
            return self.backend_client.send_incident(canonical_model)
        elif isinstance(canonical_model, CanonicalVehicleDensity):
            return self.backend_client.send_vehicle_density(canonical_model)
        else:
            raise TypeError(f"Unrecognized canonical model type: {type(canonical_model)}")

orchestrator_core = EdgeOrchestrator()

