#!/usr/bin/env python3
"""
TransitEye — Person 3 Missing Infrastructure Inference Engine
Performs object detection using YOLOv8n for Missing Infrastructure hazards.
"""

import os
from typing import List, Dict, Any, Union, Optional
import numpy as np
from PIL import Image

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


class MissingInfrastructureDetector:
    """
    Inference Engine for Missing Infrastructure Detection.
    Encapsulates YOLOv8n model loading, preprocessing, inference execution, and postprocessing.
    """

    def __init__(
        self,
        weights_path: Optional[str] = None,
        classes_path: Optional[str] = None,
        device: str = "cpu"
    ):
        self.device = device
        self.module_dir = os.path.dirname(os.path.abspath(__file__))
        
        if weights_path is None:
            weights_path = os.path.join(self.module_dir, "weights", "best.pt")
            if not os.path.exists(weights_path):
                # Fallback to pretrained base model if trained weights do not exist yet
                weights_path = "yolov8n.pt"

        if classes_path is None:
            classes_path = os.path.join(self.module_dir, "classes.txt")

        self.weights_path = weights_path
        self.classes_path = classes_path
        self.class_names = self._load_classes(classes_path)
        
        if ULTRALYTICS_AVAILABLE:
            self.model = YOLO(self.weights_path)
        else:
            self.model = None

    def _load_classes(self, path: str) -> Dict[int, str]:
        classes = {}
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                idx = 0
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        classes[idx] = line
                        idx += 1
        return classes

    def predict_image(
        self,
        image_input: Union[str, np.ndarray, Image.Image],
        conf: float = 0.25,
        iou: float = 0.7,
        imgsz: int = 320
    ) -> Dict[str, Any]:
        """
        Runs object detection on a single image input.
        Returns a structured dictionary of detections.
        """
        if not ULTRALYTICS_AVAILABLE or self.model is None:
            raise RuntimeError("Ultralytics library is not installed or model failed to initialize.")

        results = self.model.predict(
            source=image_input,
            conf=conf,
            iou=iou,
            imgsz=imgsz,
            device=self.device,
            verbose=False
        )

        detections = []
        if len(results) > 0:
            boxes = results[0].boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                score = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()
                
                class_label = self.class_names.get(cls_id, self.model.names.get(cls_id, f"class_{cls_id}"))

                detections.append({
                    "class_id": cls_id,
                    "class_name": class_label,
                    "confidence": round(score, 4),
                    "bbox_xyxy": [round(v, 2) for v in xyxy],
                })

        return {
            "module": "missing_infrastructure",
            "weights_used": self.weights_path,
            "detection_count": len(detections),
            "detections": detections
        }


if __name__ == "__main__":
    detector = MissingInfrastructureDetector()
    print(f"Initialized MissingInfrastructureDetector (Weights: {detector.weights_path})")
