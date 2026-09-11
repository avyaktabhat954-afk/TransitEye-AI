"""
TransitEye VRU Safety AI - Baseline Model Verification Script
Checkpoint VRU-1: Pretrained YOLOv8n Baseline Evaluation

Evaluates a pretrained YOLOv8 model on sample test images to verify environment
readiness and measure baseline perception latency without custom training.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from ultralytics import YOLO

# COCO Class mapping for reference
VRU_CLASS_IDS = {
    0: "person",
    1: "bicycle",
    3: "motorcycle"
}

CONTEXT_VEHICLE_CLASS_IDS = {
    2: "car",
    5: "bus",
    7: "truck"
}

def run_baseline(
    source_dir: str,
    weights_path: str = "yolov8n.pt",
    conf_threshold: float = 0.25,
    output_json: str = None
):
    source_path = Path(source_dir)
    if not source_path.exists():
        print(f"Error: Source path '{source_dir}' does not exist.")
        sys.exit(1)

    # Collect images
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    if source_path.is_file():
        image_files = [source_path]
    else:
        image_files = sorted([p for p in source_path.iterdir() if p.suffix.lower() in image_extensions])

    if not image_files:
        print(f"Error: No image files found in '{source_dir}'.")
        sys.exit(1)

    print("==================================================")
    print(" TransitEye VRU Safety AI - Baseline Inference")
    print(" Checkpoint: VRU-1 (Pretrained Baseline Verification)")
    print("==================================================")
    print(f"Model Weights       : {weights_path}")
    print(f"Confidence Threshold: {conf_threshold}")
    print(f"Test Images Found   : {len(image_files)}")
    print("--------------------------------------------------\n")

    # Load pretrained model
    t_load_start = time.perf_counter()
    model = YOLO(weights_path)
    load_time_sec = time.perf_counter() - t_load_start
    print(f"[Init] Model loaded in {load_time_sec:.3f}s (Device: {model.device})\n")

    results_summary = []

    for idx, img_file in enumerate(image_files, 1):
        print(f"[{idx}/{len(image_files)}] Processing: {img_file.name}")
        
        # Run inference
        t_start = time.perf_counter()
        results = model.predict(
            source=str(img_file),
            conf=conf_threshold,
            verbose=False
        )
        total_time_ms = (time.perf_counter() - t_start) * 1000.0

        res = results[0]
        speed_info = res.speed  # dict with preprocess, inference, postprocess in ms
        
        detected_boxes = []
        vru_detections = []
        other_detections = []

        for box in res.boxes:
            cls_id = int(box.cls.item())
            cls_name = model.names.get(cls_id, f"class_{cls_id}")
            confidence = float(box.conf.item())
            xyxy = [round(v, 2) for v in box.xyxy[0].tolist()]

            det_info = {
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(confidence, 4),
                "bbox_xyxy": xyxy
            }
            detected_boxes.append(det_info)

            if cls_id in VRU_CLASS_IDS:
                vru_detections.append(det_info)
            else:
                other_detections.append(det_info)

        img_result = {
            "image": img_file.name,
            "latency_ms": {
                "preprocess": round(speed_info.get("preprocess", 0.0), 2),
                "inference": round(speed_info.get("inference", 0.0), 2),
                "postprocess": round(speed_info.get("postprocess", 0.0), 2),
                "total_wall_clock": round(total_time_ms, 2)
            },
            "total_detections_count": len(detected_boxes),
            "vru_detections_count": len(vru_detections),
            "vru_detections": vru_detections,
            "other_detections": other_detections
        }
        results_summary.append(img_result)

        # Print per-image observation
        vru_str = ", ".join([f"{d['class_name']} ({d['confidence']:.2f})" for d in vru_detections]) if vru_detections else "None"
        other_str = ", ".join([f"{d['class_name']} ({d['confidence']:.2f})" for d in other_detections[:3]])
        if len(other_detections) > 3:
            other_str += f" (+{len(other_detections) - 3} more)"
        
        print(f"  - Latency: preprocess={speed_info.get('preprocess', 0):.1f}ms | inference={speed_info.get('inference', 0):.1f}ms | postprocess={speed_info.get('postprocess', 0):.1f}ms")
        print(f"  - VRU Detections ({len(vru_detections)}): {vru_str}")
        print(f"  - Context Objects ({len(other_detections)}): {other_str or 'None'}")
        print()

    # Latency Aggregates
    inference_times = [r["latency_ms"]["inference"] for r in results_summary]
    avg_inf = sum(inference_times) / len(inference_times) if inference_times else 0.0
    min_inf = min(inference_times) if inference_times else 0.0
    max_inf = max(inference_times) if inference_times else 0.0

    print("==================================================")
    print(" Baseline Inference Summary")
    print("==================================================")
    print(f"Total Samples Evaluated: {len(results_summary)}")
    print(f"Inference Latency (CPU) : Avg = {avg_inf:.2f} ms | Min = {min_inf:.2f} ms | Max = {max_inf:.2f} ms")
    print("==================================================")

    if output_json:
        out_path = Path(output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "checkpoint": "VRU-1",
                "model_weights": weights_path,
                "conf_threshold": conf_threshold,
                "latency_stats_ms": {
                    "avg_inference": round(avg_inf, 2),
                    "min_inference": round(min_inf, 2),
                    "max_inference": round(max_inf, 2)
                },
                "results": results_summary
            }, f, indent=2)
        print(f"Results recorded to: {output_json}")

    return results_summary

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run TransitEye VRU Baseline Inference")
    parser.add_argument("--source", type=str, default=os.path.join("data", "samples", "vru"), help="Path to sample image or folder")
    parser.add_argument("--weights", type=str, default="yolov8n.pt", help="Path or name of model weights")
    parser.add_argument("--conf", type=str, default="0.25", help="Confidence threshold")
    parser.add_argument("--output-json", type=str, default=None, help="Optional output JSON path")
    args = parser.parse_args()

    run_baseline(
        source_dir=args.source,
        weights_path=args.weights,
        conf_threshold=float(args.conf),
        output_json=args.output_json
    )
