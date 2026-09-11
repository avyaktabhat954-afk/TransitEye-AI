# P3-4 Experiment 3 — Resolution Scaling at 640x640

> **CLASSIFICATION**: `NEWLY DESIGNED — HISTORICAL SPECIFICATION NOT VERIFIED`

## 1. Objective
Determine whether increasing input resolution from 320x320 to 640x640 improves detection of road defects—especially the rare/fine-grained `transverse_crack` (D10)—when the successful Exp2 D10-oversampled training configuration is otherwise held strictly constant.

## 2. Hypothesis
Increasing input resolution from 320x320 to 640x640 will provide finer spatial information for narrow road cracks and may improve D10 detection performance, while preserving or improving overall detector performance across major road-defect classes.

*(Note: This hypothesis is an experimental conjecture and not a guaranteed outcome).*

## 3. Independent Variable
- **`imgsz`**:
  - **Exp2 (Control)**: `320`
  - **Exp3 (Treatment)**: `640`

This is the **ONLY** intentional experimental change between Exp2 and Exp3.

## 4. Fixed Variables (Planned Controls Inherited from Exp2)
- **Model**: YOLOv8n
- **Pretrained Initialization**: `yolov8n.pt`
- **Dataset YAML**: `data/experiments/p3_4_exp2_d10_oversampling/data.yaml`
- **Training Images**: 6,357 (6,165 canonical + 192 D10 duplicates)
- **Validation Images**: 1,541 (Untouched canonical validation set)
- **Validation Split**: Untouched (1,541 images / 1,352 objects)
- **Epochs**: 25
- **Batch Size**: 32
- **Dataloader Workers**: 2
- **Random Seed**: 42 (`deterministic = True`)
- **Execution Device**: CPU
- **Optimizer**: `auto` (AdamW: `lr0=0.00125`, `momentum=0.9`, `weight_decay=0.0005`)
- **Augmentation Configuration**: Default Ultralytics baseline (`mosaic=1.0`, `close_mosaic=10`, `fliplr=0.5`, `translate=0.1`, `scale=0.5`)
- **Loss Formulation**: Standard YOLOv8 (`box=7.5`, `cls=0.5`, `dfl=1.5`)
- **Class Weighting / Focal Loss**: None

*(Note: The above parameters represent planned controls inherited from verified Exp2, not measured Exp3 runtime values).*

## 5. Experimental Groups
- **Control / Reference Condition**: **P3-4 Exp2** — 320x320 resolution + 5x D10 image-level oversampling.
- **Treatment Condition**: **P3-4 Exp3** — 640x640 resolution + 5x D10 image-level oversampling.

## 6. Evaluation Metrics

### Primary Evaluation Metrics
- `transverse_crack` (D10) Precision
- `transverse_crack` (D10) Recall
- `transverse_crack` (D10) mAP50
- `transverse_crack` (D10) mAP50-95

### Secondary Evaluation Metrics
- Overall Precision
- Overall Recall
- Overall mAP50
- Overall mAP50-95
- Per-class AP50 (`longitudinal_crack`, `alligator_crack`, `pothole`)
- Per-class AP50-95
- Training Duration & Wall-Clock Latency
- Best Epoch

## 7. Reference Baseline (Measured Exp2 Values)

The following values represent the **MEASURED** reference baseline from P3-4 Exp2 (320x320):

### Overall Reference Metrics (Exp2)
- **Precision**: 0.330869
- **Recall**: 0.321682
- **mAP50**: 0.261083
- **mAP50-95**: 0.107415

### D10 Reference Metrics (Exp2)
- **D10 Precision**: 0.080600
- **D10 Recall**: 0.200000 (3 out of 15 objects detected)
- **D10 mAP50**: 0.047200
- **D10 mAP50-95**: 0.012900

*(Caveat: The validation split contains 1,541 images with only 15 ground-truth D10 objects across 12 images. Due to this small D10 sample size, metric shifts must be interpreted with caution and should not be claimed as statistically significant without replication).*

## 8. Comparative Acceptance / Decision Framework

Exp3 will be considered **FAVORABLE** if:
1. D10 AP50 and/or D10 recall improves over the Exp2 baseline (Recall > 0.2000 or mAP50 > 0.0472),
2. Overall mAP50 is preserved or improved relative to Exp2 (`overall mAP50 >= 0.2611`),
3. Major classes (`longitudinal_crack`, `alligator_crack`, `pothole`) do not suffer unacceptable regression,
4. Training execution remains numerically stable,
5. The precision/recall trade-off is improved or maintained (Exp2 D10 precision was 0.0806; recall gains must be evaluated alongside false-positive generation).

Existing Project Reference Threshold:
- `overall mAP50 >= 0.25` *(Existing project reference threshold for baseline acceptance)*.

## 9. Dataset Integrity & Reusability
- **Dataset Reused**: The existing verified dataset at `data/experiments/p3_4_exp2_d10_oversampling/data.yaml` is used directly without modification.
- **No Dataset Regeneration**: No dataset preparation script will be run for Exp3.
- **Validation Isolation**: The 1,541 validation images and 1,352 annotations remain 100% untouched.
- **No Additional Oversampling / Synthetic Boxes**: Sampling distribution remains identical to Exp2.

## 10. Expected Compute Consideration
- **640x640 Runtime**: `NOT TESTED`
- **Computational Impact**: Expected computational cost is higher than 320x320 because each input image contains 4x as many pixels (640x640 vs 320x320), but actual wall-clock duration must be measured empirically.

## 11. Proposed Training Command

```bash
.venv/bin/python3 scripts/train_road_defects.py \
  --epochs 25 \
  --imgsz 640 \
  --project runs/experiments \
  --name p3_4_exp3_640resolution \
  --weights-dir ml/road_defects/weights/exp3 \
  --data-yaml data/experiments/p3_4_exp2_d10_oversampling/data.yaml
```

> **STATUS**: `NOT EXECUTED`

## 12. Smoke Test Policy
A separate runtime feasibility smoke test must be approved and performed before executing the full 25-epoch training run. The smoke test serves exclusively to measure memory consumption and per-epoch wall-clock timing, and must not be treated as a model performance evaluation.

---

**EXP3 STATUS: SPECIFICATION COMPLETE — TRAINING NOT STARTED**
