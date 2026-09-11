import sys
import os
import base64
import tempfile
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

# Ensure REPO_ROOT and EDGE_ORCHESTRATOR_DIR are in sys.path
REPO_ROOT = Path(__file__).resolve().parents[2]
EDGE_ORCHESTRATOR_DIR = Path(__file__).resolve().parent

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(EDGE_ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(EDGE_ORCHESTRATOR_DIR))

from app.config.settings import settings
from app.orchestrator.core import orchestrator_core
from app.orchestrator.context import MockContextProvider

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

# Enable CORS for local dev / frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# Model instances (Lazy loaded)
_MODELS_CACHE = {}

def get_model_instance(model_id: str):
    if model_id in _MODELS_CACHE:
        return _MODELS_CACHE[model_id]
    
    if model_id in ["traffic", "vru_safety"]:
        from ultralytics import YOLO
        weights_path = REPO_ROOT / "yolov8n.pt"
        if not weights_path.exists():
            weights_path = "yolov8n.pt"
        model = YOLO(str(weights_path))
        _MODELS_CACHE["traffic"] = model
        _MODELS_CACHE["vru_safety"] = model
        return model

    elif model_id == "anpr":
        from ml.anpr.inference import ANPRPipeline
        weights_path = REPO_ROOT / "ml" / "anpr" / "weights" / "best.pt"
        pipeline = ANPRPipeline(weights_path=weights_path)
        _MODELS_CACHE["anpr"] = pipeline
        return pipeline

    elif model_id == "waterlogging":
        from ml.waterlogging.inference import WaterloggingDetector
        weights_path = REPO_ROOT / "ml" / "waterlogging" / "weights" / "best.pt"
        detector = WaterloggingDetector(weights_path=weights_path)
        _MODELS_CACHE["waterlogging"] = detector
        return detector

    return None

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
        "connected_pipelines": ["traffic", "vru_safety", "anpr", "waterlogging"],
        "deferred_pipelines": ["road_defect", "missing_infrastructure"],
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

@app.post("/infer")
def run_multi_model_inference(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Executes real inference for requested available AI pipelines (traffic, vru_safety, anpr, waterlogging).
    Passes raw results through domain adapters and forwards canonical outputs to backend API.
    """
    image_b64 = payload.get("image_b64")
    image_path_str = payload.get("image_path")
    requested_models = payload.get("models", ["traffic", "vru_safety", "anpr", "waterlogging"])

    context = MockContextProvider(bus_id=settings.edge_bus_id).get_current_context()

    # Save image to temp file for inference
    temp_img_path = None
    if image_b64:
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(image_b64)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(img_bytes)
            temp_img_path = tmp.name
    elif image_path_str and os.path.exists(image_path_str):
        temp_img_path = image_path_str
    else:
        # Fallback to sample traffic image if no input provided
        temp_img_path = str(REPO_ROOT / "ml" / "traffic" / "sample_input" / "real_traffic_sample.jpg")

    results = {}
    overlays = []
    statuses = {
        "traffic": "READY" if "traffic" in requested_models else "OFF",
        "vru_safety": "READY" if "vru_safety" in requested_models else "OFF",
        "anpr": "READY" if "anpr" in requested_models else "OFF",
        "waterlogging": "READY" if "waterlogging" in requested_models else "OFF",
        "road_defect": "NOT CONNECTED",
        "missing_infra": "NOT CONNECTED",
        "missing_infrastructure": "NOT CONNECTED"
    }

    try:
        # 1. TRAFFIC PIPELINE
        if "traffic" in requested_models:
            from ml.traffic.inference import detect_vehicles
            t_model = get_model_instance("traffic")
            t_raw = detect_vehicles(t_model, temp_img_path, conf_threshold=0.25)
            t_raw["vehicle_count"] = t_raw["total_approved_detections"]
            t_raw["class_breakdown"] = t_raw["detections_by_class"]
            
            # Forward via orchestrator
            backend_res = orchestrator_core.process_and_forward("traffic", t_raw)
            results["traffic"] = {
                "vehicle_count": t_raw["vehicle_count"],
                "class_breakdown": t_raw["class_breakdown"],
                "detections_count": len(t_raw["detections"]),
                "backend_response": backend_res
            }
            statuses["traffic"] = "RUNNING"

            # Add overlays
            for d in t_raw["detections"]:
                overlays.append({
                    "model": "traffic",
                    "label": f"{d['class']} {d['confidence']:.2f}",
                    "confidence": d["confidence"],
                    "bbox": d["bbox"],
                    "type": "bbox"
                })

        # 2. VRU SAFETY PIPELINE
        if "vru_safety" in requested_models:
            v_model = get_model_instance("vru_safety")
            v_res = v_model.predict(source=temp_img_path, conf=0.25, verbose=False)[0]
            vru_detections = []
            VRU_CLASSES = {0: "person", 1: "bicycle", 3: "motorcycle"}

            for box in v_res.boxes:
                cls_id = int(box.cls.item())
                if cls_id in VRU_CLASSES:
                    conf = float(box.conf.item())
                    xyxy = [round(v, 2) for v in box.xyxy[0].tolist()]
                    raw_vru = {
                        "subtype": VRU_CLASSES[cls_id],
                        "confidence": round(conf, 4),
                        "bbox": xyxy,
                        "class_id": cls_id
                    }
                    backend_res = orchestrator_core.process_and_forward("vru_safety", raw_vru)
                    vru_detections.append({
                        "raw": raw_vru,
                        "backend_response": backend_res
                    })
                    overlays.append({
                        "model": "vru_safety",
                        "label": f"{VRU_CLASSES[cls_id]} {conf:.2f}",
                        "confidence": conf,
                        "bbox": xyxy,
                        "type": "bbox"
                    })

            results["vru_safety"] = {
                "count": len(vru_detections),
                "detections": vru_detections
            }
            statuses["vru_safety"] = "RUNNING"

        # 3. ANPR PIPELINE
        if "anpr" in requested_models:
            anpr_pipe = get_model_instance("anpr")
            anpr_raw = anpr_pipe.predict(temp_img_path)
            
            if anpr_raw.get("plate_text") and anpr_raw["plate_text"] != "UNKNOWN":
                backend_res = orchestrator_core.process_and_forward("anpr", anpr_raw)
                results["anpr"] = {
                    "plate_text": anpr_raw["plate_text"],
                    "plate_confidence": anpr_raw["plate_confidence"],
                    "detector_confidence": anpr_raw["detector_confidence"],
                    "ocr_confidence": anpr_raw["ocr_confidence"],
                    "bbox": anpr_raw["bbox"],
                    "backend_response": backend_res
                }
                if anpr_raw.get("bbox"):
                    overlays.append({
                        "model": "anpr",
                        "label": f"PLATE: {anpr_raw['plate_text']} ({anpr_raw['plate_confidence']:.2f})",
                        "confidence": anpr_raw["plate_confidence"],
                        "bbox": anpr_raw["bbox"],
                        "type": "bbox"
                    })
            else:
                results["anpr"] = {"status": "no_plate_detected"}
            statuses["anpr"] = "RUNNING"

        # 4. WATERLOGGING PIPELINE
        if "waterlogging" in requested_models:
            wl_det = get_model_instance("waterlogging")
            wl_raw = wl_det.predict(temp_img_path)
            
            if wl_raw.get("total_mask_area_ratio", 0) > 0 or wl_raw.get("detections"):
                backend_res = orchestrator_core.process_and_forward("waterlogging", wl_raw)
                results["waterlogging"] = {
                    "total_mask_area_ratio": wl_raw["total_mask_area_ratio"],
                    "severity": wl_raw["severity"],
                    "detections_count": len(wl_raw["detections"]),
                    "backend_response": backend_res
                }
                for d in wl_raw.get("detections", []):
                    overlays.append({
                        "model": "waterlogging",
                        "label": f"Waterlogging ({wl_raw['severity']}) {d['confidence']:.2f}",
                        "confidence": d["confidence"],
                        "bbox": d["bbox"],
                        "type": "mask",
                        "area_ratio": d.get("mask_area_ratio", 0)
                    })
            else:
                results["waterlogging"] = {"status": "no_waterlogging_detected"}
            statuses["waterlogging"] = "RUNNING"

    finally:
        # Clean up temp file if created
        if image_b64 and temp_img_path and os.path.exists(temp_img_path):
            try:
                os.remove(temp_img_path)
            except Exception:
                pass

    return {
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "statuses": statuses,
        "pipeline_results": results,
        "overlays": overlays
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False)
