from ultralytics import YOLO
from pathlib import Path
import json
import sys


MODEL_PATH = Path("runs/experiments/p3_missing_infra_exp1/weights/best.pt")

CLASS_NAMES = {
    0: "broken_signage",
    1: "broken_pole",
}


model = YOLO(str(MODEL_PATH))


def detect(image_path: str, confidence: float = 0.25):
    results = model.predict(
        source=image_path,
        imgsz=640,
        conf=confidence,
        device="cpu",
        verbose=False,
    )

    detections = []

    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence_score = float(box.conf[0])

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "type": CLASS_NAMES.get(class_id, "unknown"),
                "confidence": round(confidence_score, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            })

    return {
        "success": True,
        "count": len(detections),
        "detections": detections,
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python p3_inference.py <image_path>")
        raise SystemExit(1)

    output = detect(sys.argv[1])
    print(json.dumps(output, indent=2))