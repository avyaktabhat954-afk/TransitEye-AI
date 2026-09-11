# Technical Handoff Specification: Person 3 Missing Infrastructure Module

> **Target Audience**: Backend Engineers, Edge Orchestrator Developers, Frontend Dashboard Team  
> **Module Status**: `TRAINED, VERIFIED & READY FOR INTEGRATION`  
> **Author**: TransitEye Person 3 ML Engineering Team  
> **Date**: September 10, 2026  

---

## 1. Executive Summary

This document specifies the technical handoff details for the **Person 3 (P3) Missing Infrastructure Perception Module** of TransitEye. The model detects real-world urban infrastructure defects—specifically damaged/broken roadside traffic signs and leaning/broken utility poles—from public bus camera streams.

All model artifacts, inference code, schemas, and test performance metrics are finalized and ready for backend and frontend integration.

---

## 2. Model Artifacts & Specifications

| Parameter | Specification |
| :--- | :--- |
| **Model Architecture** | YOLOv8n (Ultralytics PyTorch) |
| **Best Model Path** | `runs/experiments/p3_missing_infra_exp1/weights/best.pt` |
| **Training History** | 20 Completed Epochs on CPU (Seed 42) |
| **Input Image Size** | $640 \times 640$ pixels (auto-scaled with aspect ratio letterboxing) |
| **Target Task** | 2D Object Detection (`detect`) |
| **Inference Script** | `scripts/p3_inference.py` |

### Target Classes
| Class ID | Target Label | Description |
| :---: | :--- | :--- |
| `0` | `broken_signage` | Damaged, bent, tilted, missing, or vandalized road traffic signs |
| `1` | `broken_pole` | Damaged, leaning, broken utility/electric poles and structural wires |

---

## 3. Empirical Test Performance Metrics

Evaluated on the official held-out test dataset (**147 images, 189 instances**):

| Evaluation Level | Precision | Recall | mAP50 | mAP50-95 | Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Overall Model** | **0.706** | **0.870** | **0.834** | **0.529** | Verified Baseline — Ready for Integration |
| `broken_signage` (0) | 0.749 | 0.995 | 0.932 | 0.606 | Verified |
| `broken_pole` (1) | 0.662 | 0.744 | 0.737 | 0.452 | Verified |

---

## 4. Inference Pipeline & API Contract

### Single-Image CLI Execution
Run the standalone inference script from the repository root:

```bash
python scripts/p3_inference.py <path_to_image>
```

#### Example Command
```bash
python scripts/p3_inference.py data/processed/p3_missing_infrastructure/images/test/1365_jpg.rf.0beeb10e870b3267c6ccceaa8a77fa29.jpg
```

---

### Python Module API Function
The inference module exposes the `detect(image_path: str, confidence: float = 0.25)` function:

```python
from scripts.p3_inference import detect

result = detect("path/to/frame.jpg", confidence=0.25)
print(result)
```

---

### Standard JSON Output Format
`scripts/p3_inference.py` outputs structured JSON:

```json
{
  "success": true,
  "count": 1,
  "detections": [
    {
      "type": "broken_signage",
      "confidence": 0.7897,
      "bbox": {
        "x1": 100.93,
        "y1": 56.18,
        "x2": 566.95,
        "y2": 640.0
      }
    }
  ]
}
```

---

### Field Specifications & Definitions

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `success` | `boolean` | `true` if model prediction executed cleanly without runtime error |
| `count` | `integer` | Total number of bounding boxes detected above confidence threshold |
| `detections` | `array` | List of detected bounding box objects |
| `detections[].type` | `string` | Predicted label enum: `"broken_signage"` or `"broken_pole"` |
| `detections[].confidence` | `float` | Model confidence score in the range $0.0000$ to $1.0000$ |
| `detections[].bbox.x1` | `float` | Top-left X pixel coordinate in original image space |
| `detections[].bbox.y1` | `float` | Top-left Y pixel coordinate in original image space |
| `detections[].bbox.x2` | `float` | Bottom-right X pixel coordinate in original image space |
| `detections[].bbox.y2` | `float` | Bottom-right Y pixel coordinate in original image space |

---

### Confidence Score Thresholding Guidelines
- **Default Confidence (`0.25`)**: High recall setting suitable for real-time edge processing streams where false positives can be filtered by multi-pass consensus.
- **Alerting Threshold (`0.50+`)**: Recommended threshold for triggering automated high-priority city maintenance alerts on the GIS Dashboard.

---

## 5. Backend Integration Pathways

### Option A: Edge Orchestrator Python Service Integration (Recommended)
1. Import `detect` inside `edge-orchestrator/app/adapters/missing_infra_adapter.py`.
2. Use `ml/missing_infrastructure/adapter.py` (`MissingInfrastructureAdapter`) to convert raw detection dicts into canonical `CanonicalDetection` payloads (`shared/schemas/detection.schema.json`).
3. Attach edge telemetry (`bus_id`, GPS `location`, UTC `timestamp`).
4. Dispatch via HTTP REST to Node.js backend: `POST /api/detections`.

### Option B: Node.js Express Controller Subprocess
Execute `scripts/p3_inference.py` via Node.js `child_process.execFile`:

```javascript
const { execFile } = require('child_process');

function runP3Inference(imagePath) {
  return new Promise((resolve, reject) => {
    execFile('python', ['scripts/p3_inference.py', imagePath], (error, stdout) => {
      if (error) return reject(error);
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(err);
      }
    });
  });
}
```

---

## 6. Division of Responsibility Matrix

### Already Implemented (P3 ML Team)
- [x] Processed and leak-audited canonical dataset (`data/processed/p3_missing_infrastructure/`).
- [x] Trained 20-epoch YOLOv8n missing infrastructure model (`runs/experiments/p3_missing_infra_exp1/weights/best.pt`).
- [x] Empirical evaluation on held-out test split (mAP50: 0.834, Recall: 0.870).
- [x] Standalone inference wrapper script (`scripts/p3_inference.py`).
- [x] Shared canonical JSON schema (`shared/schemas/detection.schema.json`).
- [x] Pydantic & dict normalization adapter (`ml/missing_infrastructure/adapter.py`).

### Still Needed to Implement (Backend & Frontend Team)
- [ ] Connect `p3_inference.py` / `MissingInfrastructureAdapter` into `EdgeOrchestrator` service routing.
- [ ] Store `broken_signage` and `broken_pole` detections in PostgreSQL / Supabase database table.
- [ ] Render missing infrastructure alerts with distinct icons/markers on the Central GIS Dashboard frontend map.
- [ ] Add filter toggles on frontend dashboard for missing infrastructure alert views.
