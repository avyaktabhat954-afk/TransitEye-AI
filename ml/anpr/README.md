# TransitEye ANPR Module

The **TransitEye ANPR (Automatic Number Plate Recognition)** module provides automated license plate detection, text recognition, and normalization into the canonical TransitEye event contract (`CanonicalIncident`) for traffic violation and safety observation streams.

---

## 1. Architecture Overview

The ANPR pipeline operates as a 2-stage perception system:

```
[ Input Vehicle Image ]
           │
           ▼
Stage 1: YOLOv8n License Plate Detector (best.pt)
           │  (Bounding box [x1, y1, x2, y2] + det_conf)
           ▼
Stage 2: 5% Bounding-Box Crop Padding Heuristic
           │  (Clamped padded crop)
           ▼
Stage 3: PaddleOCR Text Recognition Engine
           │  (Raw text string + ocr_conf)
           ▼
Stage 4: Conservative Post-Processing & Confidence Derivation
           │  (Normalized plate_text or "UNKNOWN", plate_confidence)
           ▼
Stage 5: ANPRAdapter Normalization
           │  (EdgeContext telemetry fusion)
           ▼
[ CanonicalIncident Event Payload ]
```

---

## 2. Component Specifications

### A. Stage 1 — YOLOv8n Plate Detector
* **Weights Path**: `ml/anpr/weights/best.pt`
* **Architecture**: Ultralytics YOLOv8n single-class (`license_plate`) detector.
* **Held-Out TEST Performance** [VERIFIED]:
  * **Precision**: `97.17%`
  * **Recall**: `94.97%`
  * **mAP50**: `97.09%`
  * **mAP50-95**: `66.66%`

> [!IMPORTANT]
> The metrics listed above are measured, held-out detection benchmark results on 1,154 test set images.

### B. Stage 2 — 5% Bounding-Box Crop Padding Heuristic
* Adds `5%` proportional padding to bounding box width and height:
  $$\text{pad}_w = 0.05 \times (x_2 - x_1), \quad \text{pad}_h = 0.05 \times (y_2 - y_1)$$
* Padded coordinates are clamped to image boundaries `[0, img_w]` and `[0, img_h]`.
* **Heuristic Note**: This working heuristic protects peripheral character edges from being clipped. It is a design choice from exploratory experiments and is not claimed as a statistical accuracy optimizer.

### C. Stage 3 & 4 — PaddleOCR & Conservative Post-Processing
* Runs PaddleOCR engine on cropped plate image.
* Converts raw text to uppercase and strips whitespace.
* Removes noise characters while retaining uppercase letters `A-Z` and digits `0-9`.
* Does **NOT** perform aggressive character substitutions (e.g. `0` $\leftrightarrow$ `O`, `1` $\leftrightarrow$ `I`) to prevent inventing missing characters.
* Unreadable or missing text defaults to `plate_text = "UNKNOWN"`.

### D. Plate Confidence Derivation
* Measured confidence is derived as:
  $$\text{plate\_confidence} = \text{round}(C_{\text{det}} \times C_{\text{ocr}}, 4)$$
* Strictly bounded in `0.0 <= plate_confidence <= 1.0`.
* If `plate_text == "UNKNOWN"`, `plate_confidence` defaults to `0.0`.

---

## 3. Usage & Execution

### Running Direct Pipeline Inference (`inference.py`)

Run inference on an input image via CLI:

```bash
python ml/anpr/inference.py --input ml/anpr/sample_input/dsA_test_car-wbs-MH20EE7598_00000_jpeg.rf.b7d8a01b6d7c838e8209ac318309cf8d.jpg --output ml/anpr/sample_output/result.json
```

Python API usage:

```python
from ml.anpr.inference import ANPRPipeline

pipeline = ANPRPipeline()
result = pipeline.predict("path/to/image.jpg")

print("Detected Plate:", result["plate_text"])
print("Confidence:", result["plate_confidence"])
```

### Using ANPRAdapter (`adapter.py`)

Normalize pipeline output into a `CanonicalIncident` object:

```python
from ml.anpr.inference import ANPRPipeline
from ml.anpr.adapter import ANPRAdapter
from app.orchestrator.context import MockContextProvider

# 1. Run inference
pipeline = ANPRPipeline()
raw_result = pipeline.predict("path/to/image.jpg")

# 2. Normalize via adapter
adapter = ANPRAdapter()
context = MockContextProvider().get_current_context()
canonical_incident = adapter.normalize(raw_result, context)

# 3. Output payload is ready for edge orchestrator dispatch
print(canonical_incident.model_dump_json(indent=2))
```

---

## 4. Input & Output Formats

### Inference Output Format (`raw_output`)

```json
{
  "plate_text": "MH20EE7598",
  "plate_confidence": 0.8071,
  "raw_ocr_text": "MH20EE7598",
  "detector_confidence": 0.8072,
  "ocr_confidence": 0.9998,
  "bbox": [57.3, 254.8, 238.7, 294.9],
  "padded_bbox": [48, 253, 248, 297],
  "crop_padding_pct": 0.05,
  "trigger_reason": "bus_lane_obstruction",
  "metadata": {
    "status": "success",
    "image_dimensions": [311, 344],
    "num_plates_detected": 1
  }
}
```

### Normalized Contract (`CanonicalIncident`)

```json
{
  "id": "inc-545cff82",
  "plate_text": "MH20EE7598",
  "plate_confidence": 0.8071,
  "trigger_reason": "bus_lane_obstruction",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "altitude": 216.5,
    "speed": 34.0,
    "heading": 175.0,
    "accuracy": 2.1
  },
  "clip_url": null,
  "bus_id": "BUS-DEL-001",
  "timestamp": "2026-09-07T11:21:12Z",
  "metadata": {
    "bbox": [57.3, 254.8, 238.7, 294.9],
    "padded_bbox": [48, 253, 248, 297],
    "raw_ocr_text": "MH20EE7598",
    "detector_confidence": 0.8072,
    "ocr_confidence": 0.9998,
    "crop_padding_pct": 0.05
  }
}
```

---

## 5. Limitations & Performance Notes

* **Detection vs OCR Accuracy**: The 20-image exploratory OCR experiment yielded 20/20 YOLO detections, 20/20 returned OCR texts, and 18/20 readable-looking strings. This was an exploratory feasibility run and is **NOT** a ground-truth character accuracy measurement.
* **Ground Truth Availability**: Ground-truth character labels are not present in the dataset; character error rate (CER) cannot be formally claimed.
* **CPU Latency**: Inference forward pass takes ~55.70 ms/image on CPU for YOLO plate detection, with PaddleOCR adding sequential text recognition overhead.
