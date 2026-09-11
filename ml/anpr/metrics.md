# TransitEye ANPR Module Metrics Report

---

### A. Dataset Overview

* **Dataset Name**: TransitEye Combined ANPR Dataset (Dataset A + Dataset B)
* **Total Image Count**: 11,548 images
* **Split Breakdown**:
  * **Train**: 9,240 images (80%)
  * **Validation**: 1,154 images (10%)
  * **Test**: 1,154 images (10%)
* **Test Bounding Boxes**: 1,194 license plate targets

---

### B. License Plate Detector Performance (Held-Out Test Set)

* **Model Architecture**: YOLOv8n (nano 1-class license plate detector)
* **Training Protocol**: 10-epoch evaluation training run
* **Best Checkpoint**: Epoch 9 (`runs/anpr_10epoch/weights/best.pt`)
* **Held-Out TEST Results** [VERIFIED]:
  * **Precision**: 97.17%
  * **Recall**: 94.97%
  * **mAP50**: 97.09%
  * **mAP50-95**: 66.66%

---

### C. Detector CPU Inference Speed

* **Test Evaluation Duration**: 82.54 seconds (total evaluation runtime on 1,154 images)
* **Per-Image Inference Latency**: 55.70 ms/image (reported PyTorch CPU model forward component)

---

### D. Exploratory OCR Pipeline Experiment

* **Sample Size**: 20 test set images
* **YOLO Plate Detection**: 20 / 20 (100% detection rate)
* **PaddleOCR Returned Text**: 20 / 20 (100% completion rate)
* **Readable-Looking Outputs**: 18 / 20
* **Average OCR Confidence**: 0.7839 (baseline experiment)

> [!NOTE]
> This 20-image run is an **exploratory feasibility experiment**, NOT a ground-truth OCR accuracy benchmark.

---

### E. Crop Padding Heuristic Experiment

Comparison of bounding-box crop padding ratios on 20 test images:

| Padding Ratio | Average OCR Confidence | Readable-Looking Outputs |
| :---: | :---: | :---: |
| **0%** | 0.7839 | 18 / 20 |
| **5%** | 0.7790 | 18 / 20 |
| **10%** | 0.7545 | 18 / 20 |

* **Selected Working Heuristic**: **5% Crop Padding**
* **Validation Note**: The 5% crop padding is a working heuristic selected to protect character edges from bounding-box clipping. The empirical result explicitly does **NOT** prove that 5% statistically improves OCR accuracy compared to 0%.

---

### F. Known Limitations

1. **Lack of Character Ground Truth**: Ground-truth character strings are not currently available for the dataset images; therefore, quantitative OCR character accuracy (CER/WER) cannot be claimed.
2. **Dataset Region Variation**: Dataset B contains foreign/multi-region license plate styles and is treated as Stage 1 detector training data rather than Indian ANPR OCR ground truth.
3. **Bounding Box Conversion**: Original polygon annotations were converted to axis-aligned bounding boxes during dataset harmonization.
4. **CPU Latency**: Sequential CPU execution (PyTorch YOLO + PaddleOCR) adds processing latency compared to GPU edge accelerators.
