import argparse
import json
import os
import sys
import time
import cv2
import torch
from ultralytics import YOLO

# Person 4 Traffic Scope: Approved vehicle classes only
APPROVED_CLASSES = {"car", "bus", "truck", "motorcycle"}

def load_model(weights_path: str = "ml/traffic/weights/yolov8n.pt") -> YOLO:
    """Loads the YOLOv8 model from the specified weights path or default location."""
    if not os.path.exists(weights_path):
        fallback_path = "yolov8n.pt"
        if os.path.exists(fallback_path):
            weights_path = fallback_path
        else:
            weights_path = "yolov8n.pt"  # Ultralytics will auto-download if missing
    
    print(f"[INFO] Loading YOLO model from: {weights_path}")
    model = YOLO(weights_path)
    return model

def detect_vehicles(
    model: YOLO,
    image_path: str,
    conf_threshold: float = 0.25,
    output_path: str = None,
    device=None
) -> dict:
    """
    Performs vehicle detection on an input image, filtering strictly for approved traffic classes:
    ['car', 'bus', 'truck', 'motorcycle'].
    
    Returns structured detection baseline result with bounding boxes, confidence, and class names.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Input image not found: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Failed to read image at {image_path}")

    start_time = time.perf_counter()
    # Run YOLO inference
    predict_kwargs = {"source": image_path, "conf": conf_threshold, "verbose": False}
    if device is not None:
        predict_kwargs["device"] = device
    results = model.predict(**predict_kwargs)
    inference_time_ms = (time.perf_counter() - start_time) * 1000.0

    detections = []
    class_counts = {c: 0 for c in sorted(list(APPROVED_CLASSES))}
    
    annotated_img = img.copy()

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = model.names.get(cls_id, str(cls_id))
            
            # Strict class filtering: retain ONLY approved vehicle classes
            if cls_name not in APPROVED_CLASSES:
                continue

            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = [round(v, 2) for v in xyxy]

            class_counts[cls_name] += 1
            detections.append({
                "class": cls_name,
                "confidence": round(conf, 4),
                "bbox": [x1, y1, x2, y2]
            })

            # Draw bounding box and label on annotated image
            cv2.rectangle(annotated_img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            label = f"{cls_name} {conf:.2f}"
            cv2.putText(
                annotated_img, label, (int(x1), max(20, int(y1) - 10)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2
            )

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, annotated_img)
        print(f"[INFO] Annotated detection output saved to: {output_path}")

    summary = {
        "input_image": image_path,
        "confidence_threshold": conf_threshold,
        "inference_time_ms": round(inference_time_ms, 2),
        "total_approved_detections": len(detections),
        "detections_by_class": class_counts,
        "detections": detections
    }

    return summary

def benchmark_latency(
    model: YOLO,
    image_path: str,
    warmup_runs: int = 3,
    measured_runs: int = 10,
    conf_threshold: float = 0.25,
    device=None
) -> dict:
    """
    Performs warm-up runs followed by repeated inference latency measurements to exclude
    first-run setup overhead.
    """
    predict_kwargs = {"conf": conf_threshold, "verbose": False}
    if device is not None:
        predict_kwargs["device"] = device

    # 1. Warm-up runs
    for _ in range(warmup_runs):
        _ = model.predict(source=image_path, **predict_kwargs)

    # 2. Measured runs
    latencies = []
    for _ in range(measured_runs):
        t0 = time.perf_counter()
        _ = model.predict(source=image_path, **predict_kwargs)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)

    avg_ms = sum(latencies) / len(latencies)
    min_ms = min(latencies)
    max_ms = max(latencies)

    return {
        "warmup_runs": warmup_runs,
        "measured_runs": measured_runs,
        "avg_latency_ms": round(avg_ms, 2),
        "min_latency_ms": round(min_ms, 2),
        "max_latency_ms": round(max_ms, 2),
        "latencies_ms": [round(l, 2) for l in latencies]
    }

def main():
    parser = argparse.ArgumentParser(description="Person 4 — YOLO Vehicle Detection Baseline (Stage 1)")
    parser.add_argument("--input", type=str, default="ml/traffic/sample_input/real_traffic_sample.jpg", help="Path to input image")
    parser.add_argument("--weights", type=str, default="ml/traffic/weights/yolov8n.pt", help="Path to YOLO weights")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--output", type=str, default="ml/traffic/sample_output/detection_result.jpg", help="Path to output image")
    parser.add_argument("--benchmark", action="store_true", help="Run latency benchmark with warm-up runs")
    parser.add_argument("--device", type=str, default=None, help="Inference device (e.g. 0 for GPU, cpu). Default: Ultralytics auto-select.")
    args = parser.parse_args()

    # Resolve device: int for GPU index, str for 'cpu', None for auto
    device = args.device
    if device is not None and device.isdigit():
        device = int(device)

    model = load_model(args.weights)
    result = detect_vehicles(model, args.input, conf_threshold=args.conf, output_path=args.output, device=device)

    if args.benchmark:
        bench_res = benchmark_latency(model, args.input, warmup_runs=3, measured_runs=10, conf_threshold=args.conf, device=device)
        result["latency_benchmark"] = bench_res

    print("\n--- STAGE 1 DETECTION BASELINE RESULT ---")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()

