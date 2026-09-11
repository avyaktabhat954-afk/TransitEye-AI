# P3-4 Experiment 4 Pilot — D10 Weighted-BCE Loss Intervention

> **STATUS**: `PILOT COMPLETED — FORMAL 25-EPOCH EXP4 NOT EXECUTED`

## 1. Objective
Determine whether applying a $5\times$ classification-loss weight ($w_{\text{D10}} = 5.0$) specifically to `transverse_crack` (D10 / class 1) accelerates D10 feature learning and improves candidate recall without causing numerical instability or excessive false positives.

## 2. Experimental Configuration
- **Model**: YOLOv8n (`yolov8n.pt`)
- **Dataset YAML**: `data/experiments/p3_4_exp2_d10_oversampling/data.yaml`
- **Training Images**: 6,357 (2,771 labeled + 3,586 background)
- **Validation Set**: 1,541 untouched canonical validation images (`data/processed/road_defects/data.yaml`)
- **Image Size**: 320x320
- **Batch Size**: 32
- **Workers**: 0
- **Random Seed**: 42 (`deterministic = True`)
- **Device**: CPU
- **Optimizer**: `auto` (AdamW)
- **Loss Weights**: `box=7.5`, `cls=0.5`, `dfl=1.5`
- **Intervention**: Class loss weight vector $\mathbf{w}_{\text{class}} = [1.0, 5.0, 1.0, 1.0]$ hooked via `on_pretrain_routine_end` callback in `scripts/train_road_defects.py`.

## 3. Pilot Results (5 Epochs)

| Epoch | GPU Mem | Box Loss | Cls Loss | DFL Loss | Val mAP50 | Val mAP50-95 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1/5 | 0G | 2.436 | 4.656 | 1.884 | 0.0470 | 0.0139 |
| 2/5 | 0G | 2.324 | 3.602 | 1.769 | 0.0524 | 0.0173 |
| 3/5 | 0G | 2.296 | 3.284 | 1.756 | 0.0891 | 0.0312 |
| 4/5 | 0G | 2.238 | 3.081 | 1.711 | 0.1245 | 0.0458 |
| 5/5 | 0G | 2.148 | 2.879 | 1.639 | 0.1762 | 0.0674 |

### Final Pilot Validation Metrics at Epoch 5 (conf=0.25 on 1,541 val set)
- **Overall Precision**: 0.2191
- **Overall Recall**: 0.2624
- **Overall mAP50**: 0.1762
- **Overall mAP50-95**: 0.0674
- **D10 Precision**: 0.0674
- **D10 Recall**: 0.1333 (2 out of 15 instances detected)
- **D10 mAP50**: 0.0249
- **D10 mAP50-95**: 0.0076

## 4. Key Findings
- **Gradient Acceleration**: Class weighting ($w_{\text{D10}} = 5.0$) successfully accelerated D10 feature learning, achieving **66.5% of Exp2's 25-epoch D10 recall** in only **20% of the training epochs** (5 vs 25).
- **Stability**: Zero loss explosion, NaN values, or gradient instability occurred.
- **Resolution Limit**: At 320x320, loss amplification alone generates elevated false positives due to low spatial resolution of thin transverse crack features.

## 5. Status & Disposition
- **Verdict**: `PROMISING WITH RESERVATIONS`
- **Reference Model Status**: Exp4 pilot is **NOT** promoted to reference model. **P3-4 Exp2 remains the official Road Defects reference model.**
- **Formal 25-Epoch Run**: **NOT EXECUTED** on CPU. Deferred to GPU environment.
