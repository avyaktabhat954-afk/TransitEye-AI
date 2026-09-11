# Experiment 1A — 5-Epoch Mac CPU Baseline

> **Experiment Status:** `READY FOR MANUAL EXECUTION`  
> **Model Family:** YOLOv8n  
> **Target Domain:** Missing Infrastructure Defect Detection (`broken_signage`, `broken_pole`)  
> **Execution Environment:** Mac CPU Only (Intel Core i5-5350U)  

---

## 1. Experiment Overview & Objective

Experiment 1A establishes the initial 5-epoch controlled CPU training baseline for the TransitEye P3 Missing Infrastructure module. The primary goal is to evaluate whether the YOLOv8n architecture learns the two target infrastructure-defect classes (`broken_signage` and `broken_pole`) correctly before deciding whether to proceed with a longer CPU training run.

---

## 2. Controlled Baseline Configuration

To ensure a clean, unconfounded baseline reference prior to optimization:

- **Model Architecture:** `YOLOv8n` (`PLANNED`)
- **Pretrained Weights:** `yolov8n.pt` (Local file at repository root) (`VERIFIED`)
- **Dataset Configuration:** `data/processed/p3_missing_infrastructure/dataset.yaml` (`VERIFIED`)
- **Target Classes:**
  - `0`: `broken_signage` (2,310 instances) (`VERIFIED`)
  - `1`: `broken_pole` (9,316 instances) (`VERIFIED`)
- **Split Counts:**
  - Train: `9,497 images` / `11,147 instances` (`VERIFIED`)
  - Validation: `237 images` / `290 instances` (`VERIFIED`)
  - Test: `147 images` (Reserved for final evaluation; NOT used during training or tuning) (`VERIFIED`)
- **Image Size:** `640x640` (`PLANNED`)
- **Epochs:** `5` (`PLANNED`)
- **Batch Size:** `16` (`PLANNED`)
- **Seed:** `42` (`PLANNED`)
- **Execution Device:** `cpu` (`VERIFIED`)
- **Augmentation:** Standard Ultralytics default augmentation (`PLANNED`)
- **Class Weighting:** `None` (`PLANNED`)
- **Oversampling:** `None` (`PLANNED`)
- **Custom Loss / Hyperparameters:** `None` (`PLANNED`)
- **Output Directory:** `runs/experiments/p3_missing_infra_exp1a/` (Git-ignored) (`PLANNED`)

---

## 3. Estimated Execution Timeline

- **Measured Time per CPU Batch:** ~`36.5 – 60.1 seconds` per batch of 16 images (`MEASURED`)
- **Batches per Epoch:** 594 batches (`MEASURED`)
- **Estimated Time per Full Epoch (CPU):** ~`6 – 10 hours` (`ESTIMATED`)
- **Estimated Total 5-Epoch Runtime (CPU):** ~`30 – 50 hours` (~`1.25 – 2 days`) (`ESTIMATED`)

---

## 4. Manual Execution Command

Run the following command from the repository root in Terminal to execute Experiment 1A:

```bash
.venv/bin/python3 -c "
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
results = model.train(
    data='data/processed/p3_missing_infrastructure/dataset.yaml',
    epochs=5,
    imgsz=640,
    batch=16,
    seed=42,
    device='cpu',
    project='runs/experiments',
    name='p3_missing_infra_exp1a',
    save=True,
    val=True
)
"
```

---

## 5. Empirical Results Log (To Be Recorded Post-Training)

*Note: All values below are currently UNKNOWN — NOT VERIFIED pending manual completion of the 5-epoch run.*

| Metric | Measured Value | Label |
| :--- | :--- | :--- |
| **Total Training Duration** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Actual Time per Epoch** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Best Epoch** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Final Box Loss (Train / Val)** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Final Class Loss (Train / Val)** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Overall mAP50** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Overall mAP50-95** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Overall Precision** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **Overall Recall** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **`broken_signage` Precision / Recall** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **`broken_signage` AP50 / AP50-95** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **`broken_pole` Precision / Recall** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |
| **`broken_pole` AP50 / AP50-95** | `UNKNOWN — NOT VERIFIED` | `UNKNOWN — NOT VERIFIED` |

---

## 6. Post-Training Convergence & Decision Matrix

Once Experiment 1A completes, we will evaluate the results against the following decision tree:

- **Option A (Learning Normally & Converging):** If validation losses decline steadily and both classes show balanced precision/recall, plan continuation toward a 10–15 epoch run.
- **Option B (Learning Poorly / Underfitting):** If loss remains flat or high, investigate learning rate, data loading, or batch size.
- **Option C (Severe Class Imbalance Disparity):** If `broken_pole` achieves high AP while `broken_signage` fails to learn due to sample size ratio (7,586 vs 2,295 images), design a targeted Class Rebalancing / Weighting experiment for Exp 1B.
- **Option D (Plateaued Early):** If metrics stagnate after Epoch 3, evaluate whether further CPU epochs are justified.
