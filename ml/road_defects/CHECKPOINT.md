# TransitEye Person 3 — Road Defects Module Checkpoint

**Date**: 2026-09-09  
**Branch**: `person3/road-defects`  
**Current Status**: `PAUSED (TRANSITION TO MISSING INFRASTRUCTURE)`  

---

## 1. Executive Summary

Road Defects model development is temporarily paused to allow Person 3 to transition to the **Missing Infrastructure** module. All Road Defects source scripts, dataset preparation tools, experiment specifications, and report documentation are preserved in this repository branch.

---

## 2. Experiment History & Verification Summary

| Experiment | Configuration | Status | Reference Status | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **P3-4 Exp1** | YOLOv8n, 320x320, 25 epochs, standard loss | `COMPLETED` | Historic Baseline | Standard baseline established after fixing 3-epoch setup |
| **P3-4 Exp2** | YOLOv8n, 320x320, 25 epochs, 5x D10 image oversampling | `COMPLETED` | **CURRENT REFERENCE** | Overall mAP50 = 0.2611, D10 Recall = 0.2000 |
| **P3-4 Exp3** | YOLOv8n, 640x640, 25 epochs planned | `DEFERRED` | Not Reference | 1-epoch CPU smoke test passed; full 25 epochs deferred due to CPU runtime |
| **P3-4 Exp4** | YOLOv8n, 320x320, 5-epoch pilot ($w_{\text{D10}} = 5.0$) | `PILOT COMPLETED` | Not Reference | 5-epoch pilot verified loss stability; formal 25 epochs deferred to GPU |

---

## 3. Official Module Reference State

- **OFFICIAL ROAD DEFECT REFERENCE MODEL**: **P3-4 Exp2** (`ml/road_defects/weights/exp2/best.pt` and `ml/road_defects/weights/best.pt`)
- **Reference Configuration**:
  - Model: YOLOv8n
  - Resolution: 320x320
  - Dataset: `data/experiments/p3_4_exp2_d10_oversampling/data.yaml` (6,357 train images)
  - Epochs: 25
  - Seed: 42 (`deterministic = True`)
- **Measured Reference Metrics (1,541 val images)**:
  - Overall Precision: 0.3309
  - Overall Recall: 0.3217
  - Overall mAP50: 0.2611
  - Overall mAP50-95: 0.1074
  - D10 (`transverse_crack`) Recall: 0.2000
  - D10 (`transverse_crack`) Precision: 0.0806
  - D10 (`transverse_crack`) mAP50: 0.0472

---

## 4. Handoff & Artifact Inventory

- **Training Script**: `scripts/train_road_defects.py` (**VERIFIED**)
- **Dataset Preparation Scripts**:
  - `scripts/prepare_road_defect_dataset.py` (**VERIFIED**)
  - `scripts/prepare_p3_4_exp2_dataset.py` (**VERIFIED**)
- **Class Definitions**: `ml/road_defects/classes.txt` (**VERIFIED**)
- **Module Requirements**: `ml/road_defects/requirements.txt` (**VERIFIED**)
- **Module Documentation**: `ml/road_defects/README.md` (**VERIFIED**)
- **Module Metrics**: `ml/road_defects/metrics.md` (**VERIFIED**)
- **Experiment Reports**:
  - `ml/road_defects/experiments/p3_4_exp1.md` (**VERIFIED**)
  - `ml/road_defects/experiments/p3_4_exp2.md` (**VERIFIED**)
  - `ml/road_defects/experiments/p3_4_exp3.md` (**VERIFIED**)
  - `ml/road_defects/experiments/p3_4_exp4_pilot.md` (**VERIFIED**)
- **Inference Module (`inference.py`)**: `ABSENT (UNPLANNED AT THIS PHASE)`
- **Adapter Module (`adapter.py`)**: `ABSENT (UNPLANNED AT THIS PHASE)`
- **Sample Input/Output**: `ABSENT (UNPLANNED AT THIS PHASE)`

---

## 5. Next Steps

1. **Immediate Task**: Begin Person 3 **Missing Infrastructure** module development.
2. **Future Road Defects Refinement**: Resume 640x640 resolution scaling (Exp3) and focal/class-weighted loss training (Exp4) when access to an NVIDIA RTX 3050 or comparable GPU environment is available.
