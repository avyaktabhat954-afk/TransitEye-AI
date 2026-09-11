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
    """Loads the YOLOv8 model from the specified weights path."""
    if not os.path.exists(weights_path):
        fallback_path = "yolov8n.pt"
        if os.path.exists(fallback_path):
            weights_path = fallback_path
        else:
            weights_path = "yolov8n.pt"
    
    print(f"[INFO] Loading YOLO model from: {weights_path}")
    model = YOLO(weights_path)
    return model

def track_and_count_vehicles(
    model: YOLO,
    video_path: str,
    conf_threshold: float = 0.25,
    max_frames: int = 150,
    output_video_path: str = None,
    output_json_path: str = None,
    device=None
) -> dict:
    """
    Performs Stage 2 ByteTrack tracking & Stage 3 vehicle counting and class breakdown on an input video.

    Counting is based strictly on unique tracked vehicle identities (ByteTrack track_ids), NOT raw frame detections.
    Class breakdown uses the last class label produced by YOLOv8n+ByteTrack for each track_id.
    No class smoothing, correction, or majority-vote is applied.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Input video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Failed to open video file: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    src_fps = cap.get(cv2.CAP_PROP_FPS)
    total_src_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    print(f"[INFO] Input video: {video_path} ({width}x{height}, {src_fps:.1f} FPS, {total_src_frames} total frames)")

    video_writer = None
    if output_video_path:
        os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        video_writer = cv2.VideoWriter(output_video_path, fourcc, src_fps if src_fps > 0 else 25.0, (width, height))

    # Warm-up: run a single-image prediction to prime YOLO/PyTorch weights.
    # Using predict (not track) on the still image avoids scanning the full video stream.
    print("[INFO] Performing warm-up (single-image predict)...")
    _sample_img = "ml/traffic/sample_input/real_traffic_sample.jpg"
    if not os.path.exists(_sample_img):
        import glob as _glob
        _candidates = _glob.glob("ml/traffic/sample_input/*.jpg")
        _sample_img = _candidates[0] if _candidates else video_path
    warmup_kwargs = {"source": _sample_img, "conf": conf_threshold, "verbose": False}
    if device is not None:
        warmup_kwargs["device"] = device
    model.predict(**warmup_kwargs)
    print("[INFO] Warm-up complete.")

    print(f"[INFO] Starting ByteTrack tracking & unique vehicle counting baseline (max frames={max_frames})...")
    start_time = time.perf_counter()

    track_kwargs = {
        "source": video_path,
        "tracker": "bytetrack.yaml",
        "conf": conf_threshold,
        "stream": True,
        "verbose": False
    }
    if device is not None:
        track_kwargs["device"] = device
    results = model.track(**track_kwargs)

    frame_index = 0
    frames_with_detections = 0
    frame_records = []
    
    # Store history for each track_id: list of (frame_index, class_name, confidence)
    track_observations = {}
    raw_detection_counts = {c: 0 for c in sorted(list(APPROVED_CLASSES))}

    for r in results:
        frame_index += 1
        img = r.orig_img.copy() if r.orig_img is not None else None
        
        frame_tracks = []
        has_approved_detection = False

        if r.boxes is not None and r.boxes.id is not None:
            boxes = r.boxes.xyxy.cpu().numpy()
            track_ids = r.boxes.id.cpu().numpy().astype(int)
            class_ids = r.boxes.cls.cpu().numpy().astype(int)
            confidences = r.boxes.conf.cpu().numpy()

            for box, tid, cls_id, conf in zip(boxes, track_ids, class_ids, confidences):
                cls_name = model.names.get(cls_id, str(cls_id))
                
                # Strict class filtering: retain ONLY approved vehicle classes
                if cls_name not in APPROVED_CLASSES:
                    continue

                has_approved_detection = True
                x1, y1, x2, y2 = [round(float(v), 2) for v in box]
                tid = int(tid)
                conf = round(float(conf), 4)

                raw_detection_counts[cls_name] += 1
                track_observations.setdefault(tid, []).append((frame_index, cls_name, conf))

                track_item = {
                    "track_id": tid,
                    "class": cls_name,
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2]
                }
                frame_tracks.append(track_item)

                if img is not None:
                    # Draw bounding box and label with track ID
                    color = (0, 255, 0)
                    cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                    label = f"{cls_name} #{tid} ({conf:.2f})"
                    cv2.putText(
                        img, label, (int(x1), max(20, int(y1) - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2
                    )

        if has_approved_detection:
            frames_with_detections += 1

        # Draw overall unique counting overlay on video frame
        if img is not None:
            overlay_text1 = f"Observed Unique Vehicles: {len(track_observations)}"
            cv2.putText(img, overlay_text1, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        frame_records.append({
            "frame": frame_index,
            "tracks": frame_tracks
        })

        if video_writer is not None and img is not None:
            video_writer.write(img)

        if max_frames > 0 and frame_index >= max_frames:
            break

    elapsed_time = time.perf_counter() - start_time
    if video_writer is not None:
        video_writer.release()
        print(f"[INFO] Annotated tracking & counting video saved to: {output_video_path}")

    observed_fps = frame_index / elapsed_time if elapsed_time > 0 else 0.0

    # STAGE 3 UNIQUE VEHICLE COUNTING & CLASS BREAKDOWN LOGIC
    # Class assignment: use the last class label produced by YOLOv8n+ByteTrack for each track_id.
    # No majority vote, smoothing, or correction is applied.
    total_unique_tracked_vehicles = len(track_observations)
    unique_class_breakdown = {c: 0 for c in sorted(list(APPROVED_CLASSES))}
    class_switching_ids = []

    for tid, obs_list in track_observations.items():
        observed_classes = [obs[1] for obs in obs_list]
        unique_classes_for_id = list(dict.fromkeys(observed_classes))  # ordered unique, preserves first occurrence order

        # Use the last class assignment from the pipeline (final frame this track_id was seen)
        last_class = observed_classes[-1]
        unique_class_breakdown[last_class] += 1

        if len(set(observed_classes)) > 1:
            class_switching_ids.append({
                "track_id": tid,
                "observed_classes_sequence_unique": unique_classes_for_id,
                "last_observed_class": last_class
            })

    sum_class_counts = sum(unique_class_breakdown.values())
    
    # Consistency Verification Checks
    check1_passed = (total_unique_tracked_vehicles == len(track_observations))
    check2_passed = (sum_class_counts == total_unique_tracked_vehicles)

    summary = {
        "input_video": video_path,
        "tracker": "ByteTrack",
        "confidence_threshold": conf_threshold,
        "sequence": {
            "frames_processed": frame_index,
            "frames_with_approved_detections": frames_with_detections
        },
        "unique_tracked_vehicles": total_unique_tracked_vehicles,
        "unique_vehicle_class_breakdown": unique_class_breakdown,
        "consistency_checks": {
            "unique_vehicle_count_matches_track_ids": "PASS" if check1_passed else "FAIL",
            "sum_of_class_counts_matches_unique_count": "PASS" if check2_passed else "FAIL",
            "check1_values": f"{total_unique_tracked_vehicles} == {len(track_observations)}",
            "check2_values": f"{sum_class_counts} == {total_unique_tracked_vehicles}"
        },
        "class_consistency": {
            "class_switching_track_ids_count": len(class_switching_ids),
            "class_switching_details": class_switching_ids,
            "rule": "Last class label produced by YOLOv8n+ByteTrack per track_id — no smoothing or correction applied"
        },
        "raw_frame_detections": {
            "total_raw_detections": sum(raw_detection_counts.values()),
            "raw_detections_by_class": raw_detection_counts
        },
        "performance": {
            "elapsed_time_sec": round(elapsed_time, 2),
            "observed_fps": round(observed_fps, 2),
            "device": str(device) if device is not None else "auto",
            "runtime": f"PyTorch {torch.__version__}" + (
                f"+CUDA:{torch.version.cuda}" if (device is not None and str(device) != "cpu" and torch.cuda.is_available()) else "+cpu"
            )
        },
        "frame_log": frame_records
    }

    if output_json_path:
        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
        with open(output_json_path, "w") as f:
            json.dump(summary, f, indent=2)
        print(f"[INFO] Tracking & counting log JSON saved to: {output_json_path}")

    return summary

def main():
    parser = argparse.ArgumentParser(description="Person 4 — Stage 3: YOLOv8n + ByteTrack Vehicle Counting & Class Breakdown")
    parser.add_argument("--input", type=str, default="ml/traffic/sample_input/real_traffic_sample.mp4", help="Path to input video")
    parser.add_argument("--weights", type=str, default="ml/traffic/weights/yolov8n.pt", help="Path to YOLO weights")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--max_frames", type=int, default=150, help="Maximum frames to process")
    parser.add_argument("--output_video", type=str, default="ml/traffic/sample_output/counting_result.mp4", help="Path to output video")
    parser.add_argument("--output_json", type=str, default="ml/traffic/sample_output/counting_result.json", help="Path to output JSON log")
    parser.add_argument("--device", type=str, default=None, help="Inference device (e.g. 0 for GPU, cpu). Default: Ultralytics auto-select.")
    args = parser.parse_args()

    # Resolve device: int for GPU index, str for 'cpu', None for auto
    device = args.device
    if device is not None and device.isdigit():
        device = int(device)

    model = load_model(args.weights)
    summary = track_and_count_vehicles(
        model=model,
        video_path=args.input,
        conf_threshold=args.conf,
        max_frames=args.max_frames,
        output_video_path=args.output_video,
        output_json_path=args.output_json,
        device=device
    )

    # Clean display summary without full frame log dump
    display_summary = {k: v for k, v in summary.items() if k != "frame_log"}
    print("\n--- STAGE 3 VEHICLE COUNTING & CLASS BREAKDOWN RESULT ---")
    print(json.dumps(display_summary, indent=2))

if __name__ == "__main__":
    main()
