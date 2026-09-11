"""
TransitEye ANPR Pipeline (Inference Module)
===========================================
2-stage ANPR pipeline:
1. YOLOv8n license plate detector (ml/anpr/weights/best.pt)
2. 5% crop padding heuristic
3. PaddleOCR text recognition
4. Conservative OCR post-processing & confidence derivation

Usage:
    from ml.anpr.inference import ANPRPipeline
    pipeline = ANPRPipeline()
    result = pipeline.predict("path/to/image.jpg")
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Tuple
import numpy as np
import cv2

# Ensure torch is imported before paddle to prevent Windows DLL loading order conflict
import torch
from ultralytics import YOLO

# Global PaddleOCR instance (lazy initialized)
_PADDLE_OCR_INSTANCE = None

def get_paddle_ocr():
    global _PADDLE_OCR_INSTANCE
    if _PADDLE_OCR_INSTANCE is None:
        from paddleocr import PaddleOCR
        # Initialize PaddleOCR with mkldnn disabled for CPU compatibility
        _PADDLE_OCR_INSTANCE = PaddleOCR(enable_mkldnn=False)
    return _PADDLE_OCR_INSTANCE


def extract_ocr_text_and_score(ocr_res: Any) -> Tuple[str, float]:
    """
    Extracts raw text and confidence score from PaddleOCR result.
    Handles both dict list structure (PaddleOCR v3.7+) and traditional list of lists.
    """
    if not ocr_res:
        return "", 0.0
    raw_texts: List[str] = []
    scores: List[float] = []

    for item in ocr_res:
        if isinstance(item, dict):
            texts = item.get("rec_texts", [])
            scs = item.get("rec_scores", [])
            for t, s in zip(texts, scs):
                if t:
                    raw_texts.append(str(t))
                    scores.append(float(s))
        elif isinstance(item, list):
            for line in item:
                if isinstance(line, (list, tuple)) and len(line) >= 2:
                    text_info = line[1]
                    if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                        txt, sc = text_info[0], text_info[1]
                        if txt:
                            raw_texts.append(str(txt))
                            scores.append(float(sc))

    raw_text = " ".join(raw_texts).strip()
    avg_score = float(np.mean(scores)) if scores else 0.0
    return raw_text, avg_score


def normalize_ocr_text(raw_text: str) -> str:
    """
    Conservative OCR post-processing:
    - Strip leading/trailing whitespace
    - Uppercase text
    - Retain alphanumeric characters and spaces
    - Does NOT swap 0/O, 1/I, 5/S (no aggressive character substitution)
    - Returns 'UNKNOWN' if result is empty
    """
    if not raw_text:
        return "UNKNOWN"
    cleaned = raw_text.strip().upper()
    # Keep uppercase letters, digits, and spaces
    cleaned = re.sub(r'[^A-Z0-9\s]', '', cleaned)
    # Remove internal spaces in license plate characters
    cleaned = re.sub(r'\s+', '', cleaned)
    return cleaned if cleaned else "UNKNOWN"


class ANPRPipeline:
    """
    Production ANPR perception pipeline for TransitEye.
    """
    def __init__(
        self,
        weights_path: Optional[Union[str, Path]] = None,
        conf_threshold: float = 0.25,
        padding_pct: float = 0.05
    ):
        if weights_path is None:
            weights_path = Path(__file__).resolve().parent / "weights" / "best.pt"
        
        self.weights_path = Path(weights_path)
        if not self.weights_path.exists():
            raise FileNotFoundError(f"ANPR weights file not found: {self.weights_path}")

        self.conf_threshold = conf_threshold
        self.padding_pct = padding_pct
        self.detector = YOLO(str(self.weights_path))

    def predict(self, image_input: Union[str, Path, np.ndarray]) -> Dict[str, Any]:
        """
        Runs full ANPR pipeline on input image.

        Returns structured dictionary containing:
        - plate_text: Normalized license plate string or 'UNKNOWN'
        - plate_confidence: Bounded float in [0.0, 1.0]
        - raw_ocr_text: Raw untouched OCR string
        - detector_confidence: YOLO detector confidence
        - ocr_confidence: PaddleOCR recognition confidence
        - bbox: Unpadded bounding box [x1, y1, x2, y2]
        - padded_bbox: 5% padded bounding box [x1_pad, y1_pad, x2_pad, y2_pad]
        - crop_padding_pct: Heuristic padding ratio (0.05)
        - trigger_reason: Violation trigger reason
        - metadata: Dictionary of extra execution info
        """
        image_path_str = str(image_input) if isinstance(image_input, (str, Path)) else "array_input"
        
        # Load image safely
        if isinstance(image_input, (str, Path)):
            img = cv2.imread(str(image_input))
            if img is None:
                return {
                    "plate_text": "UNKNOWN",
                    "plate_confidence": 0.0,
                    "raw_ocr_text": "",
                    "detector_confidence": 0.0,
                    "ocr_confidence": 0.0,
                    "bbox": None,
                    "padded_bbox": None,
                    "crop_padding_pct": self.padding_pct,
                    "trigger_reason": "bus_lane_obstruction",
                    "metadata": {
                        "status": "error",
                        "error_message": f"Could not read image from {image_path_str}"
                    }
                }
        elif isinstance(image_input, np.ndarray):
            img = image_input
        else:
            return {
                "plate_text": "UNKNOWN",
                "plate_confidence": 0.0,
                "raw_ocr_text": "",
                "detector_confidence": 0.0,
                "ocr_confidence": 0.0,
                "bbox": None,
                "padded_bbox": None,
                "crop_padding_pct": self.padding_pct,
                "trigger_reason": "bus_lane_obstruction",
                "metadata": {
                    "status": "error",
                    "error_message": "Unsupported image_input type"
                }
            }

        img_h, img_w = img.shape[:2]

        # Stage 1: YOLOv8n Plate Detection
        det_results = self.detector(img, conf=self.conf_threshold, verbose=False)
        
        boxes = []
        if det_results and len(det_results) > 0 and det_results[0].boxes is not None:
            boxes = det_results[0].boxes

        if len(boxes) == 0:
            return {
                "plate_text": "UNKNOWN",
                "plate_confidence": 0.0,
                "raw_ocr_text": "",
                "detector_confidence": 0.0,
                "ocr_confidence": 0.0,
                "bbox": None,
                "padded_bbox": None,
                "crop_padding_pct": self.padding_pct,
                "trigger_reason": "bus_lane_obstruction",
                "metadata": {
                    "status": "no_detection",
                    "image_dimensions": [img_w, img_h],
                    "num_plates_detected": 0
                }
            }

        # Select highest confidence plate detection
        best_box_idx = int(np.argmax(boxes.conf.cpu().numpy()))
        box = boxes[best_box_idx]
        det_conf = float(box.conf.cpu().numpy()[0])
        xyxy = box.xyxy.cpu().numpy()[0]
        x1, y1, x2, y2 = [float(v) for v in xyxy]

        # Stage 2: 5% Bounding-Box Crop Padding
        box_w = x2 - x1
        box_h = y2 - y1
        pad_w = self.padding_pct * box_w
        pad_h = self.padding_pct * box_h

        x1_pad = max(0, int(round(x1 - pad_w)))
        y1_pad = max(0, int(round(y1 - pad_h)))
        x2_pad = min(img_w, int(round(x2 + pad_w)))
        y2_pad = min(img_h, int(round(y2 + pad_h)))

        crop = img[y1_pad:y2_pad, x1_pad:x2_pad]

        # Stage 3: PaddleOCR Text Recognition
        ocr_engine = get_paddle_ocr()
        raw_ocr_text = ""
        ocr_conf = 0.0

        if crop.size > 0:
            try:
                ocr_res = ocr_engine.ocr(crop)
                raw_ocr_text, ocr_conf = extract_ocr_text_and_score(ocr_res)
            except Exception as e:
                raw_ocr_text = ""
                ocr_conf = 0.0

        # Stage 4: Conservative Post-Processing & Plate Confidence Derivation
        plate_text = normalize_ocr_text(raw_ocr_text)

        if plate_text != "UNKNOWN" and ocr_conf > 0.0:
            # Derived plate confidence: det_conf * ocr_conf bounded in [0.0, 1.0]
            plate_confidence = max(0.0, min(1.0, round(det_conf * ocr_conf, 4)))
        else:
            plate_text = "UNKNOWN"
            plate_confidence = 0.0

        return {
            "plate_text": plate_text,
            "plate_confidence": plate_confidence,
            "raw_ocr_text": raw_ocr_text,
            "detector_confidence": round(det_conf, 4),
            "ocr_confidence": round(ocr_conf, 4),
            "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
            "padded_bbox": [x1_pad, y1_pad, x2_pad, y2_pad],
            "crop_padding_pct": self.padding_pct,
            "trigger_reason": "bus_lane_obstruction",
            "metadata": {
                "status": "success",
                "image_path": image_path_str,
                "image_dimensions": [img_w, img_h],
                "num_plates_detected": len(boxes)
            }
        }


def main():
    parser = argparse.ArgumentParser(description="TransitEye ANPR Pipeline Inference")
    parser.add_argument("--input", type=str, required=True, help="Path to input vehicle image")
    parser.add_argument("--output", type=str, default=None, help="Path to save output JSON result")
    parser.add_argument("--weights", type=str, default=None, help="Path to YOLOv8n best.pt model weights")
    args = parser.parse_args()

    pipeline = ANPRPipeline(weights_path=args.weights)
    result = pipeline.predict(args.input)

    json_str = json.dumps(result, indent=2)
    print(json_str)

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(json_str)
        print(f"\nResult saved to {out_path}")

if __name__ == "__main__":
    main()
