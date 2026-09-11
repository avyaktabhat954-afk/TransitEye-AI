# P3 Missing Infrastructure Experiment 1 Specification

> **STATUS**: `SPECIFICATION COMPLETE — TRAINING PENDING (DATASET AWAITING VERIFICATION)`

## 1. Objective
Establish the baseline YOLOv8n object detection model for Missing Infrastructure hazard identification across urban transit corridors.

## 2. Hypothesis
A custom-trained YOLOv8n detector trained on a verified custom-labelled urban infrastructure dataset at 320x320 resolution will provide real-time edge detection capability suitable for mobile bus deployment.

## 3. Planned Experimental Controls
- **Model**: YOLOv8n (`yolov8n.pt`)
- **Pretrained Initialization**: Ultralytics COCO pretrained weights
- **Dataset YAML**: `data/processed/missing_infrastructure/data.yaml` *(Target path upon dataset delivery)*
- **Image Size (`imgsz`)**: 320x320
- **Epochs**: 25
- **Batch Size**: 32
- **Dataloader Workers**: 0 (CPU optimized)
- **Random Seed**: 42 (`deterministic = True`)
- **Device**: CPU / GPU (System dependent)
- **Optimizer**: `auto` (AdamW)
- **Loss Configuration**: Standard YOLOv8 (`box=7.5`, `cls=0.5`, `dfl=1.5`)
- **Output Directory**: `runs/experiments/p3_missing_infra_exp1`
- **Destination Weights Directory**: `ml/missing_infrastructure/weights`

## 4. Evaluation Metrics & Acceptance Criteria
- **Primary Metric**: `overall mAP50 >= 0.25`
- **Secondary Metrics**:
  - Overall Precision and Recall
  - Overall mAP50-95
  - Per-class Precision, Recall, and AP50
  - Edge Inference Latency (target <= 100ms per frame)

## 5. Current Blockers & Prerequisites
- **Dataset**: Custom-labelled dataset is not yet present on disk. Training will commence immediately upon dataset arrival and class verification.
