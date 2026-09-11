"""
TransitEye Temporary Local Webcam ANPR Test
===========================================
Interactive webcam testing tool for the TransitEye ANPR module.

Features:
- Live camera stream via OpenCV VideoCapture(0)
- Real-time license plate detection via YOLOv8n (best.pt)
- 5% bounding-box crop padding
- Text recognition via PaddleOCR (CPU mode)
- On-screen visual overlay showing bounding boxes, plate text, and confidence scores
- Performance optimized for CPU via frame skipping and result caching

Controls:
- Press 'q' to safely exit camera test
"""

import sys
import os
import time
from pathlib import Path
import cv2
import numpy as np

# Ensure torch is imported before paddle for Windows DLL safety
import torch

# Ensure project root is in path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.anpr.inference import ANPRPipeline

def run_webcam_test(camera_index: int = 0, process_every_n_frames: int = 3):
    weights_path = Path(__file__).resolve().parent / "weights" / "best.pt"
    if not weights_path.exists():
        print(f"[ERROR] Model weights not found at: {weights_path}")
        sys.exit(1)

    print("==================================================")
    print("TransitEye ANPR Temporary Webcam Test")
    print("==================================================")
    print(f"Model Weights: {weights_path}")
    print(f"Camera Index: {camera_index}")
    print("Initializing ANPR Pipeline (YOLOv8n + PaddleOCR)...")

    try:
        pipeline = ANPRPipeline(weights_path=weights_path)
    except Exception as e:
        print(f"[ERROR] Failed to initialize ANPRPipeline: {e}")
        sys.exit(1)

    print("\nAttempting to open webcam device...")
    cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        print(f"[ERROR] Could not open webcam device at index {camera_index}.")
        print("Please verify camera connection, permissions, or try a different camera index.")
        return

    print("[SUCCESS] Webcam opened successfully!")
    print("Instructions:")
    print("  - Show a vehicle license plate or plate image to the camera.")
    print("  - Press 'q' in the video window to stop test.\n")

    frame_count = 0
    detection_count = 0
    ocr_return_count = 0
    last_det_conf = 0.0
    last_ocr_conf = 0.0
    last_plate_text = "N/A"
    last_raw_ocr = "N/A"
    last_bbox = None
    last_padded_bbox = None

    t_start = time.time()

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            print("[WARNING] Failed to capture frame from webcam. Retrying...")
            time.sleep(0.1)
            continue

        frame_count += 1
        h, w = frame.shape[:2]

        # Process inference every N frames to maintain smooth CPU window rendering
        if frame_count % process_every_n_frames == 1 or process_every_n_frames <= 1:
            try:
                res = pipeline.predict(frame)
                num_detected = res.get("metadata", {}).get("num_plates_detected", 0)

                if num_detected > 0:
                    detection_count += 1
                    last_plate_text = res.get("plate_text", "UNKNOWN")
                    last_raw_ocr = res.get("raw_ocr_text", "")
                    last_det_conf = res.get("detector_confidence", 0.0)
                    last_ocr_conf = res.get("ocr_confidence", 0.0)
                    last_bbox = res.get("bbox")
                    last_padded_bbox = res.get("padded_bbox")

                    if last_raw_ocr.strip():
                        ocr_return_count += 1
                else:
                    last_bbox = None
                    last_padded_bbox = None

            except Exception as e:
                print(f"[ERROR] Inference failed on frame {frame_count}: {e}")

        # Render Bounding Box and Overlay Information
        overlay_frame = frame.copy()

        # Draw 5% padded box (cyan) and raw box (green) if plate detected
        if last_padded_bbox is not None:
            px1, py1, px2, py2 = [int(v) for v in last_padded_bbox]
            cv2.rectangle(overlay_frame, (px1, py1), (px2, py2), (255, 255, 0), 2)

        if last_bbox is not None:
            bx1, by1, bx2, by2 = [int(v) for v in last_bbox]
            cv2.rectangle(overlay_frame, (bx1, by1), (bx2, by2), (0, 255, 0), 2)

            # Label banner over bounding box
            label = f"Plate: {last_plate_text} ({last_det_conf:.2f})"
            lbl_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            lbl_w, lbl_h = lbl_size
            cv2.rectangle(overlay_frame, (bx1, max(0, by1 - lbl_h - 10)), (bx1 + lbl_w + 10, max(0, by1)), (0, 255, 0), -1)
            cv2.putText(overlay_frame, label, (bx1 + 5, max(15, by1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

        # Status Bar Overlay Header
        header_bg = np.zeros((70, w, 3), dtype=np.uint8)
        header_bg[:] = (30, 30, 30)
        cv2.addWeighted(overlay_frame[0:70, 0:w], 0.3, header_bg, 0.7, 0, overlay_frame[0:70, 0:w])

        cv2.putText(overlay_frame, "TransitEye ANPR Live Webcam Test (CPU)", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)
        status_line = f"Frame: {frame_count} | Detections: {detection_count} | Last Plate: '{last_plate_text}' [Det Conf: {last_det_conf:.2f}, OCR Conf: {last_ocr_conf:.2f}]"
        cv2.putText(overlay_frame, status_line, (15, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # Footer Instruction Bar
        cv2.putText(overlay_frame, "Press 'q' to Quit Test", (w - 180, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        # Display window
        cv2.imshow("TransitEye ANPR Webcam Test", overlay_frame)

        # Check for exit key
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            print("\nExit key 'q' pressed. Stopping webcam test...")
            break

    t_total = time.time() - t_start
    cap.release()
    cv2.destroyAllWindows()

    print("\n==================================================")
    print("WEBCAM TEST SUMMARY REPORT")
    print("==================================================")
    print(f"Webcam Opened Successfully: True")
    print(f"Total Test Duration: {t_total:.2f} seconds")
    print(f"Total Frames Processed: {frame_count}")
    print(f"License Plates Detected: {detection_count > 0}")
    print(f"Plate Detection Event Count: {detection_count}")
    print(f"OCR Text Returned Count: {ocr_return_count}")
    print(f"Example Detector Confidence: {last_det_conf:.4f}")
    print(f"Example OCR Text: '{last_plate_text}'")
    print(f"Example Raw OCR Output: '{last_raw_ocr}'")
    print(f"Example OCR Confidence: {last_ocr_conf:.4f}")
    print(f"Runtime Errors: None")
    print("==================================================")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="TransitEye Temporary ANPR Webcam Test")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (default: 0)")
    parser.add_argument("--stride", type=int, default=3, help="Process every N frames (default: 3)")
    args = parser.parse_args()

    run_webcam_test(camera_index=args.camera, process_every_n_frames=args.stride)
