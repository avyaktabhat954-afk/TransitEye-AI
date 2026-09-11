# TRANSITEYE — PERSON 4 TRAFFIC MODEL PERFORMANCE & VALIDATION METRICS

## 1. Executive Summary & Model Overview

* **Role**: Person 4 — Traffic Flow & Density Specialist
* **Approved Scope**: Vehicle Detection, Tracking, Unique Counting, Class Breakdown, Relative Density, Traffic Flow/Direction.
* **Excluded Scope (Strictly Deferred)**: VRU, Pedestrian Risk, Vehicle Speed, Congestion Classification, Traffic Prediction/Forecasting, ANPR, Road Defects, Waterlogging.
* **Model Baseline Artifact**: Pretrained YOLOv8n (`ml/traffic/weights/yolov8n.pt`) on COCO dataset. (Note: The master plan references `best.pt` as a generic handoff artifact placeholder for custom-trained models, but the traffic module uses the pretrained `yolov8n.pt` artifact without modification or renaming).
* **Tracker Baseline**: ByteTrack (`tracker="bytetrack.yaml"`).
* **Approved Vehicle Classes**: `car`, `bus`, `truck`, `motorcycle`.
* **Default Confidence Threshold**: `0.25` (**PROTOTYPE BASELINE** — not claimed optimal).

---

## 2. Quantitative Performance Measurements (MEASURED)

All metrics below were measured on the host environment: Intel(R) Core(TM) i7-14650HX CPU, PyTorch 2.14.0+cpu, Python 3.14.6.

### 2.1 Inference & Tracking Throughput (CPU Baseline)

| Component / Pipeline Stage | Measured Value | Unit | Condition / Details |
| :--- | :--- | :--- | :--- |
| **Single-Frame Inference Latency (CPU)** | **43.09 ms** | Avg per frame | YOLOv8n single image predict (Intel Core i7-14650HX CPU, batch=1) |
| **Pure Track Inference Throughput (CPU)** | **4.95 s / 30.27 FPS** | Total for 150 frames | Pure YOLOv8n + ByteTrack 150-frame tracking execution (72 unique vehicles) |
| **Stage 4 Density Computation Latency** | **1.40 ms** | Total for 150 frames | Pure relative density calculation on Stage 3 `frame_log` (0.0014 s) |
| **Stage 5 Flow Calculation Latency** | **2.70 ms** | Total for 150 frames | Center-point displacement calculation on Stage 3 `frame_log` (0.0027 s) |
| **Stage 6 Adapter Normalization Latency** | **0.40 ms** | Per payload | `TrafficAdapter.format_vehicle_density()` execution |
| **Stage 6 Edge-to-Backend Handoff Latency** | **32.07 ms** | Per HTTP post | Full payload ingestion to Node/Express `/api/vehicle-density` |

### 2.2 GPU-Accelerated Performance (NVIDIA RTX 3050 Laptop GPU, CUDA 12.6, PyTorch 2.14.0+cu126)

| Component / Pipeline Stage | Measured Value | Unit | Condition / Details |
| :--- | :--- | :--- | :--- |
| **Single-Image Inference Latency (GPU)** | **15.50 ms** | Avg per frame | YOLOv8n predict with `--device 0` (NVIDIA RTX 3050 Laptop GPU, 4GB VRAM) |
| **150-Frame Tracking Throughput (GPU)** | **4.33 s / 34.63 FPS** | Total for 150 frames | YOLOv8n + ByteTrack 150-frame tracking with `device=0` (72 unique vehicles) |

---

## 3. Ground-Truth Validation & Accuracy Statements

| Evaluation Dimension | Qualification / Accuracy Statement | Reason / Qualification Details |
| :--- | :--- | :--- |
| **Vehicle Detection Accuracy** | **NOT TESTED** | Prototype baseline (COCO pretrained YOLOv8n); no annotated ground-truth test set. |
| **ByteTrack Unique Counting Accuracy** | **NOT TESTED** | 72 unique vehicle track IDs observed on sample video; no annotated ground-truth MOTA/IDF1 available. |
| **Relative Density Computation Formula** | **VERIFIED** | Formally verified via mathematical sanity checks (relative density range [0.7083, 1.0], peak active count = 24 vehicles). |
| **Relative Density Accuracy** | **NOT TESTED** | Formal ground-truth accuracy metrics (MAE, RMSE) NOT TESTED. |
| **Physical Density (vehicles/km²)** | **NOT TESTED** | NOT TESTED because no road-area or camera calibration exists. |
| **Traffic Flow / Direction Accuracy** | **NOT TESTED** | Formal direction classification accuracy: NOT TESTED (No ground-truth directional labels exist; displacement logic spotchecks passed 5/5). |

---

## 4. Held-Out Dataset Audit & Limitation

> [!WARNING]
> **HELD-OUT VALIDATION**: **NOT TESTED — NO GENUINELY HELD-OUT TRAFFIC DATA AVAILABLE.**
> The only real traffic sample assets available (`real_traffic_sample.mp4` and `real_traffic_sample.jpg`) were used during initial pipeline development and testing in Stages 1–5, and therefore cannot serve as a genuinely held-out validation set.

---

## 5. Adverse & Edge-Case Evaluation

| Adverse / Edge Case | System Behavior & Observations | Qualification / Verification Status |
| :--- | :--- | :--- |
| **Vehicle Overlap / Class Switching** | Class label switching was observed on six track IDs (IDs 11, 12, 22, 42, 125, 318). The available validation did not establish the cause. | **OBSERVED** |
| **Flow Trajectory UNKNOWN Classification** | 41 of 72 tracks classified as `unknown` flow direction. The flow implementation assigns `unknown` when observations < 5 OR total displacement < 10 px (31 tracks had displacement ≥ 10 px out of 62 tracks with ≥ 5 observations). | **OBSERVED** |
| **Night / Low-Light Conditions** | No test video available. | **NOT TESTED — NO SUITABLE SAMPLE AVAILABLE** |
| **Adverse Weather (Rain / Fog)** | No test video available. | **NOT TESTED — NO SUITABLE SAMPLE AVAILABLE** |
| **Camera Motion / Shake** | No test video available. | **NOT TESTED — NO SUITABLE SAMPLE AVAILABLE** |

---

## 6. Software & Integration Regression Tests (Pass Rates ≠ Model Accuracy)

> [!NOTE]
> The test pass rates below represent software unit and system integration regression suite results, NOT model perception accuracy.

* **Adapter Unit Tests (`test_adapter.py`)**: 8/8 PASS
* **Integration Tests (`test_integration.py`)**: 5/5 PASS
* **Edge Orchestrator Core Suite (`test_edge_orchestrator.py`)**: 11/11 PASS

---

## 7. Handoff Package Completeness Checklist

- [x] **Weights Artifact**: `ml/traffic/weights/yolov8n.pt` (Pretrained YOLOv8n COCO model)
- [x] **Classes Specification**: `ml/traffic/classes.txt` (`car`, `bus`, `truck`, `motorcycle`)
- [x] **Detection Engine**: `ml/traffic/inference.py` (YOLOv8n vehicle baseline with `--benchmark`)
- [x] **Tracking & Counting Engine**: `ml/traffic/tracking.py` (ByteTrack multi-object tracking)
- [x] **Density Engine**: `ml/traffic/density.py` (Relative vehicle density calculation)
- [x] **Flow Engine**: `ml/traffic/flow.py` (Directional displacement flow summary)
- [x] **Model Adapter**: `ml/traffic/adapter.py` (`TrafficAdapter` integrating with `EdgeOrchestrator`)
- [x] **Sample Inputs**: `ml/traffic/sample_input/real_traffic_sample.jpg`, `real_traffic_sample.mp4`
- [x] **Sample Outputs**: `ml/traffic/sample_output/` (`counting_result.json`, `density_result.json`, `flow_result.json`, etc.)
- [x] **Adapter Unit Tests**: `ml/traffic/test_adapter.py`
- [x] **Integration Tests**: `ml/traffic/test_integration.py`
- [x] **Dependencies**: `ml/traffic/requirements.txt`
- [x] **Documentation**: `ml/traffic/README.md` and `ml/traffic/metrics.md`
