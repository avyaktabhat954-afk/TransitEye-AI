from abc import ABC, abstractmethod
from typing import Any, Union
from pydantic import BaseModel
from app.orchestrator.context import EdgeContext

class ModelAdapter(ABC):
    """
    Abstract Model Adapter Interface.
    Enables independently replaceable AI models by decoupling perception
    inference outputs from the edge orchestrator and backend contracts.
    """

    @property
    @abstractmethod
    def domain(self) -> str:
        """Returns the domain category handled by this adapter."""
        pass

    @abstractmethod
    def normalize(self, raw_output: Any, context: EdgeContext) -> BaseModel:
        """
        Normalizes raw AI model output into a canonical TransitEye contract payload,
        supplementing missing edge context (bus_id, GPS, timestamp) as needed.
        """
        pass
