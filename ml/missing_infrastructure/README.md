# TransitEye Person 3 — Missing Infrastructure Detection Module

> **Module Status**: `TRAINED & VERIFIED — READY FOR HANDOFF`  
> **Model Family**: YOLOv8n  
> **Target Domain**: Edge-AI Missing & Deficient Urban Infrastructure Detection  
> **Best Model Checkpoint**: `runs/experiments/p3_missing_infra_exp1/weights/best.pt`  
> **Inference Entry Point**: `scripts/p3_inference.py`  

---

## 1. Module Overview

The Missing Infrastructure module transforms public bus cameras into mobile sensors for detecting missing, damaged, or deficient urban infrastructure (specifically roadside traffic signs and electrical/utility poles).

Observations are processed locally at the edge using YOLOv8n (`runs/experiments/p3_missing_infra_exp1/weights/best.pt`) and formatted via `scripts/p3_inference.py` or normalized via `MissingInfrastructureAdapter` into canonical `CanonicalDetection` payloads for the TransitEye Edge Orchestrator and Central GIS Dashboard.

---

## 2. Model & Performance Summary

- **Model Architecture**: YOLOv8n (Object Detection)
- **Training Epochs**: 20 Completed Epochs on CPU (Seed 42)
- **Input Resolution**: $640 \times 640$ pixels
- **Best Weights Location**: `runs/experiments/p3_missing_infra_exp1/weights/best.pt`

### Key Empirical Test Metrics (147 Test Images, 189 Instances)
- **Precision**: `0.706` (70.6%)
- **Recall**: `0.870` (87.0%)
- **mAP50**: `0.834` (83.4%)
- **mAP50-95**: `0.529` (52.9%)

---

## 3. Dataset & Target Classes

- **Canonical Dataset Location**: `data/processed/p3_missing_infrastructure/`
- **Class Definitions**:
  - `0`: `broken_signage` (Damaged, missing, tilted, or vandalized road signs)
  - `1`: `broken_pole` (Damaged, broken, leaning, or fallen electrical/utility poles and structural wiring)

---

## 4. Inference Usage

### Running Single-Image Inference
Execute the inference wrapper script from the repository root:

```bash
python scripts/p3_inference.py data/processed/p3_missing_infrastructure/images/test/1365_jpg.rf.0beeb10e870b3267c6ccceaa8a77fa29.jpg
```

### Expected Standard JSON Output
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

## 5. Master Handoff Documentation

Detailed technical handoff specifications for the Backend and Frontend engineering teams are documented in:  
📄 **[docs/P3_MISSING_INFRASTRUCTURE_HANDOFF.md](../../docs/P3_MISSING_INFRASTRUCTURE_HANDOFF.md)**
