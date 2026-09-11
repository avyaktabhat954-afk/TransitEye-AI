# YOLOv8n Road Defect Detection — Baseline Metrics

## 1. Experiment Overview
- **Dataset Source**: Crowdsensing Road Defect Detection Dataset (India subset)
- **Processed Dataset Path**: `data/processed/road_defects/`
- **Dataset Configuration**: `data/processed/road_defects/data.yaml`
- **Model Architecture**: YOLOv8n (`yolov8n.pt` pretrained initialization)
- **Model Version**: Ultralytics YOLOv8.4.140
- **Training Script**: `scripts/train_road_defects.py`
- **Checkpoint**: P3-3 Baseline

## 2. Environment & Execution Hardware
- **Operating System**: macOS Darwin 21.6.0 (x86_64) [VERIFIED]
- **CPU**: Intel(R) Core(TM) i5-5350U CPU @ 1.80GHz (2 physical cores, 4 logical cores) [VERIFIED]
- **System RAM**: 8.00 GB (8,589,934,592 bytes) [VERIFIED]
- **Available Disk Space**: ~24 GiB on `/System/Volumes/Data` [VERIFIED]
- **CUDA Availability**: False (No NVIDIA CUDA hardware present) [VERIFIED]
- **Apple Silicon MPS Availability**: False (x86_64 Intel architecture) [VERIFIED]
- **Execution Mode**: CPU [VERIFIED]
- **Python Version**: 3.11.11 (virtualenv `.venv`) [VERIFIED]
- **PyTorch Version**: 2.2.2 (`torch-2.2.2-cp311-none-macosx_10_9_x86_64`) [VERIFIED]
- **Torchvision Version**: 0.17.2 [VERIFIED]
- **Ultralytics Version**: 8.4.140 [VERIFIED]

## 3. Training Hyperparameters
- **Random Seed**: 42 (Deterministic) [VERIFIED]
- **Image Size (`imgsz`)**: 320x320 [MEASURED] *(Configured due to 2-core CPU hardware constraints; benchmark at 640x640 measured 1.45s/image = ~2.8h/epoch)*
- **Epochs**: 3 [VERIFIED]
- **Batch Size**: 32 [VERIFIED]
- **Dataloader Workers**: 2 [VERIFIED]
- **Optimizer**: AdamW (lr0=0.00125, momentum=0.9, weight_decay=0.0005) [VERIFIED]
- **Augmentation**: Default Ultralytics baseline (mosaic=1.0, fliplr=0.5, translate=0.1, scale=0.5) [VERIFIED]
- **Loss Formulation**: Standard YOLOv8 (box=7.5, cls=0.5, dfl=1.5) without custom loss or class weighting [VERIFIED]

## 4. Dataset Partitioning & Counts
- **Total Dataset Images**: 7,706 [VERIFIED]
  - Training Images: 6,165 (3,586 negative backgrounds, 2,579 with defects) [VERIFIED]
  - Validation Images: 1,541 (896 negative backgrounds, 645 with defects) [VERIFIED]
- **Total Retained Defect Objects**: 6,832 [VERIFIED]
  - Training Instances: 5,480 [VERIFIED]
  - Validation Instances: 1,352 [VERIFIED]

## 5. Measured Baseline Metrics (Overall Validation)
Evaluated on the full 1,541 validation images (1,352 ground-truth defect objects) using `best.pt`:

| Metric | Measured Value | Verification Status | Notes |
|:---|:---|:---|:---|
| **Training Duration** | 4836.99 s (80.62 min / 1.30 hr) | MEASURED | 3 full epochs on CPU |
| **Validation Image Count** | 1,541 | VERIFIED | Full validation split |
| **Validation Object Count** | 1,352 | VERIFIED | Across 645 positive images |
| **Overall Precision (P)** | 0.1843 (18.43%) | MEASURED | Post-training validation |
| **Overall Recall (R)** | 0.1777 (17.77%) | MEASURED | Post-training validation |
| **Overall mAP@50** | 0.1246 (12.46%) | MEASURED | Post-training validation |
| **Overall mAP@50-95** | 0.0462 (4.62%) | MEASURED | Post-training validation |

## 6. Per-Class Metrics Breakdown

| Class ID | Class Name | Val Images | Val Instances | Precision (P) | Recall (R) | mAP@50 | mAP@50-95 | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 0 | `longitudinal_crack` | 220 | 320 | 0.1400 | 0.1220 | 0.0636 | 0.0215 | MEASURED |
| 1 | `transverse_crack` (D10) | 12 | 15 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | MEASURED |
| 2 | `alligator_crack` | 358 | 407 | 0.4720 | 0.3120 | 0.3180 | 0.1250 | MEASURED |
| 3 | `pothole` | 289 | 610 | 0.1250 | 0.2770 | 0.1170 | 0.0387 | MEASURED |

## 7. Transverse Crack (D10) Analysis & Limitations
- **Total Dataset Instances**: 68 across 7,706 images (53 train, 15 validation) [VERIFIED]
- **Validation Images Containing D10**: 12 images [MEASURED]
- **Validation D10 Instances**: 15 objects [MEASURED]
- **D10 Precision**: 0.0000 [MEASURED]
- **D10 Recall**: 0.0000 [MEASURED]
- **D10 mAP@50**: 0.0000 [MEASURED]
- **D10 mAP@50-95**: 0.0000 [MEASURED]
- **Limitation Analysis**:
  Transverse crack represents only 0.99% of total defect instances in the dataset (68 / 6,832) and 1.1% of validation instances (15 / 1,352). In this initial 3-epoch baseline without class balancing or oversampling, the network learned features primarily for dominant classes (`alligator_crack` with 407 val instances, `pothole` with 610 val instances, and `longitudinal_crack` with 320 val instances). The extreme sparsity resulted in 0 detections above threshold for D10. As instructed, the baseline was maintained without ad-hoc alterations to establish an unskewed reference point for future targeted experimentation in P3-4.

## 8. Measured Inference Latency & Throughput
- **Single-Image Latency (CPU, Intel i5-5350U @ 1.80GHz)**:
  - 320x320: 114.4 ms / frame [MEASURED]
  - 640x640: 371.3 ms / frame [MEASURED]
- **Batched Validation Throughput (batch=32, 320x320, CPU)**:
  - Preprocess: 1.2 ms / image [MEASURED]
  - Inference: 66.8 ms / image [MEASURED]
  - Loss: 0.0 ms / image [MEASURED]
  - Postprocess (NMS): 1.4 ms / image [MEASURED]
  - Total per-frame pipeline: ~69.4 ms (~14.4 FPS) [MEASURED]

## 9. Model Artifacts
- Checkpoint (Best): `ml/road_defects/weights/best.pt` (5.9 MB) [VERIFIED]
- Checkpoint (Last): `ml/road_defects/weights/last.pt` (5.9 MB) [VERIFIED]
- Class Names: `ml/road_defects/classes.txt` [VERIFIED]
