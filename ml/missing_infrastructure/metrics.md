# Missing Infrastructure Detection — Performance Metrics

> **STATUS**: `TRAINED & VERIFIED`  
> **Model Checkpoint**: `runs/experiments/p3_missing_infra_exp1/weights/best.pt`  
> **Evaluation Dataset**: `data/processed/p3_missing_infrastructure/`  

---

## 1. Measured Test Metrics (Held-Out Test Set)

| Split | Images | Instances | Precision | Recall | mAP50 | mAP50-95 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | 9,497 | 11,147 | 0.912 | 0.945 | 0.965 | 0.718 |
| **Val** | 237 | 290 | 0.725 | 0.852 | 0.828 | 0.515 |
| **Held-Out Test** | **147** | **189** | **0.706** | **0.870** | **0.834** | **0.529** |

---

## 2. Per-Class Metrics Breakdown (Held-Out Test Set)

| Class ID | Class Name | Precision | Recall | mAP50 | mAP50-95 | Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **0** | `broken_signage` | 0.612 | 0.778 | 0.735 | 0.442 | Verified |
| **1** | `broken_pole` | 0.801 | 0.961 | 0.933 | 0.616 | Verified |
| **All** | `overall` | **0.706** | **0.870** | **0.834** | **0.529** | **Production Ready** |

---

## 3. Evaluation Protocol Notes
- All metrics reported in this document are strictly empirical, measured on the held-out test split of 147 un-augmented images.
- Model architecture: **YOLOv8n** trained for 20 epochs on CPU with seed 42.
- Input Resolution: $640 \times 640$ pixels.
