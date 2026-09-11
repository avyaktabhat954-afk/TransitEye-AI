# Person 3 — Road Defect Detection (AI/ML)

## 1. Purpose
This module provides road defect detection models for the TransitEye platform. The model identifies structural road surface damage from captured camera frames, categorizing detections into standardized distress categories.

## 2. Target Classes
The model detects exactly four target road surface defect classes:

| Class ID | Class Name | Description | RDD2020 Equivalent |
|:---|:---|:---|:---|
| 0 | `longitudinal_crack` | Linear cracks parallel to the road travel direction | D00 |
| 1 | `transverse_crack` | Linear cracks perpendicular to the road travel direction | D10 |
| 2 | `alligator_crack` | Interconnected fatigue cracking patterns | D20 |
| 3 | `pothole` | Bowl-shaped road surface depressions / holes | D40 |

The exact class definitions are listed in [classes.txt](file:///Users/akash/.gemini/antigravity-ide/scratch/TransitEye/ml/road_defects/classes.txt).

## 3. Dataset
The training dataset is located at [data/processed/road_defects/](file:///Users/akash/.gemini/antigravity-ide/scratch/TransitEye/data/processed/road_defects/) and configured via [data.yaml](file:///Users/akash/.gemini/antigravity-ide/scratch/TransitEye/data/processed/road_defects/data.yaml).
- **Dataset Partitioning**:
  - Train: 6,165 images (3,586 negative backgrounds, 2,579 images with defect objects)
  - Validation: 1,541 images (896 negative backgrounds, 645 images with defect objects)
  - Total: 7,706 images
- **Retained Objects**: 6,832 total defect instances (5,480 train, 1,352 val)
- **Deterministic Split**: Random seed 42, 80/20 train/val split.
- **Background Filtering**: Retains negative background images to suppress false positive road markings and road surface textures.

## 4. Training Command & Configuration
Baseline training was executed using [scripts/train_road_defects.py](file:///Users/akash/.gemini/antigravity-ide/scratch/TransitEye/scripts/train_road_defects.py) using the following baseline parameters:

```bash
# Environment activation
source .venv/bin/activate

# Execute baseline training
python scripts/train_road_defects.py
```

### Configuration Parameters:
- **Base Architecture**: YOLOv8n (`yolov8n.pt` pretrained)
- **Image Size**: 320x320 (configured due to 2-core CPU hardware execution constraints; 640x640 demonstrated 1.45s/image = ~2.8h/epoch)
- **Batch Size**: 32
- **Epochs**: 3
- **Seed**: 42
- **Device**: CPU
- **Optimizer**: AdamW (auto-selected lr0=0.00125, momentum=0.9)
- **Loss Functions**: Default YOLOv8 box, cls, dfl losses without custom weighting

## 5. Model Artifact Location
Trained weights and configuration are stored inside:
- Best Checkpoint: `ml/road_defects/weights/best.pt` (5.9 MB)
- Final Checkpoint: `ml/road_defects/weights/last.pt` (5.9 MB)
- Classes Definition: `ml/road_defects/classes.txt`
- Metrics Log: `ml/road_defects/metrics.md`
- Dependencies: `ml/road_defects/requirements.txt`

## 6. Current Measured Performance (P3-3 Baseline)
Measured on the full 1,541 validation images (1,352 defect instances) with `weights/best.pt`:

| Metric | Measured Value | Verification Status |
|:---|:---|:---|
| **Overall Precision (P)** | 0.1843 (18.43%) | MEASURED |
| **Overall Recall (R)** | 0.1777 (17.77%) | MEASURED |
| **Overall mAP@50** | 0.1246 (12.46%) | MEASURED |
| **Overall mAP@50-95** | 0.0462 (4.62%) | MEASURED |
| **Training Duration** | 80.62 minutes (1.30 hours) | MEASURED |
| **Inference Latency (single image, CPU)** | 114.4 ms (320x320) / 371.3 ms (640x640) | MEASURED |

### Per-Class Performance:
- **Longitudinal Crack**: P = 0.1400, R = 0.1220, mAP50 = 0.0636, mAP50-95 = 0.0215
- **Transverse Crack (D10)**: P = 0.0000, R = 0.0000, mAP50 = 0.0000, mAP50-95 = 0.0000
- **Alligator Crack**: P = 0.4720, R = 0.3120, mAP50 = 0.3180, mAP50-95 = 0.1250
- **Pothole**: P = 0.1250, R = 0.2770, mAP50 = 0.1170, mAP50-95 = 0.0387

## 7. Known Limitations & D10 Class Imbalance
1. **Severe Transverse Crack (D10) Imbalance**:
   - Total dataset instances: 68 (53 train, 15 validation across 12 images).
   - In this unweighted 3-epoch baseline, D10 scored 0 across all metrics due to severe data scarcity relative to the dominant classes.
2. **Hardware Constraints**:
   - CPU-only execution on dual-core Intel Core i5-5350U without GPU acceleration limits training throughput and necessitated 320x320 resolution for feasible local execution.
3. **Edge Optimization & Integration Status**:
   - No quantization (INT8/FP16) or ONNX export has been performed yet (planned for P3-5).
   - Inference module and ModelAdapter integration are not yet implemented (scheduled for P3-5/P3-6).
