"""
TransitEye Waterlogging Inference Module
========================================
Production instance segmentation inference pipeline for road waterlogging detection.
Uses pre-trained YOLOv8n-Seg (runs/segment/ml/waterlogging/runs/waterlogging_production_20ep/weights/best.pt).

Key Features:
- Instance segmentation mask pixel area & area ratio calculation
- Union-mask area ratio calculation avoiding double counting overlapping instances
- Heuristic severity classification ('none', 'low', 'medium', 'high') based on surface coverage ratio
- Safe handling of missing images, zero detections, and edge cases

Usage:
    from ml.waterlogging.inference import WaterloggingDetector
    detector = WaterloggingDetector()
    result = detector.predict("path/to/image.jpg")
"""

import sys
import os
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import numpy as np
import cv2
import torch
from ultralytics import YOLO


def classify_severity(area_ratio: float) -> str:
    """
    HEURISTIC SEVERITY ESTIMATE
    ===========================
    Estimates waterlogging severity based on spatial surface area coverage ratio.
    Note: This is a surface coverage heuristic and does NOT estimate physical water depth.

    Heuristic Thresholds:
    - 0.00: 'none'
    - > 0.00 and < 0.05: 'low'    (Localized puddle / minor shallow water accumulation)
    - >= 0.05 and < 0.25: 'medium' (Noticeable flooded road segment)
    - >= 0.25: 'high'              (Extensive road flooding covering major frame portion)
    """
    if area_ratio <= 0.0:
        return "none"
    elif area_ratio < 0.05:
        return "low"
    elif area_ratio < 0.25:
        return "medium"
    else:
        return "high"


class WaterloggingDetector:
    """
    Production Waterlogging Segmentation Detector for TransitEye.
    """
    def __init__(
        self,
        weights_path: Optional[Union[str, Path]] = None,
        conf_threshold: float = 0.25
    ):
        if weights_path is None:
            # Candidate 1: relative to current script
            candidate_1 = Path(__file__).resolve().parents[2] / "runs" / "segment" / "ml" / "waterlogging" / "runs" / "waterlogging_production_20ep" / "weights" / "best.pt"
            # Candidate 2: relative to working directory
            candidate_2 = Path("runs/segment/ml/waterlogging/runs/waterlogging_production_20ep/weights/best.pt")

            if candidate_1.exists():
                weights_path = candidate_1
            elif candidate_2.exists():
                weights_path = candidate_2
            else:
                weights_path = candidate_1  # fallback for clear error message

        self.weights_path = Path(weights_path)
        if not self.weights_path.exists():
            raise FileNotFoundError(f"Waterlogging weights file not found: {self.weights_path}")

        self.conf_threshold = conf_threshold
        self.detector = YOLO(str(self.weights_path))

    def predict(self, image_input: Union[str, Path, np.ndarray]) -> Dict[str, Any]:
        """
        Runs waterlogging segmentation inference on input image.

        Args:
            image_input: File path (str/Path) or loaded BGR numpy image array.

        Returns:
            Structured dictionary containing event_type, instance detections,
            total union mask area ratio, heuristic severity, and execution metadata.
        """
        image_path_str = str(image_input) if isinstance(image_input, (str, Path)) else "array_input"

        # Load image safely
        if isinstance(image_input, (str, Path)):
            input_path = Path(image_input)
            if not input_path.exists():
                return {
                    "event_type": "waterlogging",
                    "detections": [],
                    "total_mask_area_ratio": 0.0,
                    "severity": "none",
                    "metadata": {
                        "status": "error",
                        "error_message": f"Image file not found: {image_path_str}"
                    }
                }
            img = cv2.imread(str(input_path))
            if img is None:
                return {
                    "event_type": "waterlogging",
                    "detections": [],
                    "total_mask_area_ratio": 0.0,
                    "severity": "none",
                    "metadata": {
                        "status": "error",
                        "error_message": f"Could not read image from {image_path_str}"
                    }
                }
        elif isinstance(image_input, np.ndarray):
            img = image_input
        else:
            return {
                "event_type": "waterlogging",
                "detections": [],
                "total_mask_area_ratio": 0.0,
                "severity": "none",
                "metadata": {
                    "status": "error",
                    "error_message": "Unsupported image_input type"
                }
            }

        img_h, img_w = img.shape[:2]
        total_pixels = img_h * img_w

        if total_pixels == 0:
            return {
                "event_type": "waterlogging",
                "detections": [],
                "total_mask_area_ratio": 0.0,
                "severity": "none",
                "metadata": {
                    "status": "error",
                    "error_message": "Image has 0 total pixels"
                }
            }

        # Run YOLOv8n-Seg inference
        det_results = self.detector(img, conf=self.conf_threshold, verbose=False)

        if not det_results or len(det_results) == 0:
            return {
                "event_type": "waterlogging",
                "detections": [],
                "total_mask_area_ratio": 0.0,
                "severity": "none",
                "metadata": {
                    "status": "no_detection",
                    "image_path": image_path_str,
                    "image_dimensions": [img_w, img_h],
                    "num_instances": 0
                }
            }

        res = det_results[0]
        boxes = res.boxes
        masks = res.masks

        if boxes is None or len(boxes) == 0 or masks is None or len(masks) == 0:
            return {
                "event_type": "waterlogging",
                "detections": [],
                "total_mask_area_ratio": 0.0,
                "severity": "none",
                "metadata": {
                    "status": "no_detection",
                    "image_path": image_path_str,
                    "image_dimensions": [img_w, img_h],
                    "num_instances": 0
                }
            }

        detections: List[Dict[str, Any]] = []
        union_mask = np.zeros((img_h, img_w), dtype=bool)

        masks_data = masks.data.cpu().numpy()
        polygons = masks.xy if hasattr(masks, "xy") else []

        for i, box in enumerate(boxes):
            conf = float(box.conf.cpu().numpy()[0])
            xyxy = box.xyxy.cpu().numpy()[0]
            bbox = [round(float(v), 1) for v in xyxy]

            # Binary mask for instance i
            mask_raw = masks_data[i]
            mask_binary = cv2.resize((mask_raw > 0.5).astype(np.uint8), (img_w, img_h), interpolation=cv2.INTER_NEAREST)

            # Additional polygon fill verification if poly available
            if i < len(polygons) and len(polygons[i]) > 0:
                poly_mask = np.zeros((img_h, img_w), dtype=np.uint8)
                cv2.fillPoly(poly_mask, [polygons[i].astype(np.int32)], 1)
                # Combine resized mask and polygon mask to ensure full coverage boundary
                mask_binary = np.logical_or(mask_binary > 0, poly_mask > 0).astype(np.uint8)

            inst_pixels = int(np.sum(mask_binary > 0))
            inst_area_ratio = round(inst_pixels / total_pixels, 4)

            union_mask = np.logical_or(union_mask, mask_binary > 0)

            detections.append({
                "class_name": "waterlogging",
                "confidence": round(conf, 4),
                "bbox": bbox,
                "mask_pixels": inst_pixels,
                "mask_area_ratio": inst_area_ratio
            })

        total_union_pixels = int(np.sum(union_mask))
        total_mask_area_ratio = round(total_union_pixels / total_pixels, 4)
        severity = classify_severity(total_mask_area_ratio)

        return {
            "event_type": "waterlogging",
            "detections": detections,
            "total_mask_area_ratio": total_mask_area_ratio,
            "severity": severity,
            "metadata": {
                "status": "success",
                "image_path": image_path_str,
                "image_dimensions": [img_w, img_h],
                "num_instances": len(detections)
            }
        }


def main():
    parser = argparse.ArgumentParser(description="TransitEye Waterlogging Segmentation Inference")
    parser.add_argument("--input", type=str, required=True, help="Path to input image")
    parser.add_argument("--output", type=str, default=None, help="Path to save output JSON result")
    parser.add_argument("--weights", type=str, default=None, help="Path to YOLOv8n-Seg model weights")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold (default: 0.25)")
    args = parser.parse_args()

    detector = WaterloggingDetector(weights_path=args.weights, conf_threshold=args.conf)
    result = detector.predict(args.input)

    json_str = json.dumps(result, indent=2)
    print(json_str)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(json_str)
        print(f"\n[INFO] Result saved to {out_path}")


if __name__ == "__main__":
    main()
