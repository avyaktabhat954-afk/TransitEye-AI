# TransitEye VRU Safety AI Module

> **Checkpoint VRU-1**: Training Environment and Dataset Preparation  
> **Status**: Verified Baseline Established  
> **Branch**: `feature/vru-safety-ai`

---

## 1. VRU Module Objective

In the TransitEye architecture (*"Every Bus. A Mobile AI Sensor for the City"*), the **Vulnerable Road User (VRU) Safety AI** module provides automated perception of vulnerable road users—pedestrians, cyclists, and two-wheeler operators—from the perspective of cameras mounted on municipal transit buses.

The high-level processing pipeline across the system is:
```text
video / frame
    ↓
person / relevant VRU detection (Checkpoint VRU-1 scope)
    ↓
spatial + temporal reasoning (Future checkpoint)
    ↓
transparent risk heuristic (Future checkpoint)
    ↓
VRU safety event
    ↓
TransitEye canonical JSON (detection.schema.json: type="vru_safety")
```

### Checkpoint VRU-1 Scope
The objective of this initial checkpoint is strictly to:
1. Verify the local Python runtime environment and resolve dependency compatibility.
2. Select and document a verified baseline/reference evaluation dataset.
3. Establish and run a real pretrained person/VRU detector baseline (`yolov8n.pt`).
4. Record actual detection observations and real measured inference latency on documented test samples.
5. Provide a reproducible benchmark record without modifying shared contracts or adjacent modules.

*No custom model training, risk scoring heuristics, temporal tracking, or orchestrator/backend integrations are implemented in this checkpoint.*

---

## 2. Dataset Selected (Baseline Evaluation Benchmark)

For Checkpoint VRU-1, **Microsoft Common Objects in Context (MS COCO 2017)** was selected and verified as the reference benchmark to evaluate out-of-the-box pretrained perception capabilities.

> **Dataset Role Note**: MS COCO 2017 serves strictly as the verified **baseline/reference evaluation benchmark** for testing the pretrained YOLOv8 detector. Selection and curation of the final specialized fine-tuning dataset (such as Cityscapes, BDD100K, or TransitEye urban bus video extractions) is explicitly deferred to **Checkpoint VRU-2**.

### Verified Dataset Facts:
- **Dataset Name**: Microsoft Common Objects in Context (MS COCO 2017)
- **Source**: Lin et al., *"Microsoft COCO: Common Objects in Context"*, European Conference on Computer Vision (ECCV 2014) / COCO Consortium
- **URL / Reference**: [https://cocodataset.org/](https://cocodataset.org/)
- **Total Samples (Verified)**: 163,957 images
- **Train / Validation / Test Split**:
  - `train2017`: 118,287 images (~72.1%)
  - `val2017`: 5,000 images (~3.1%)
  - `test2017`: 40,670 images (~24.8%)
- **Classes**: 80 object categories (detailed below)
- **License / Usage**:
  - Annotations: Creative Commons Attribution 4.0 International (CC BY 4.0)
  - Images: Flickr Creative Commons licenses (individual image terms vary)
- **Relevance to VRU Perception**:
  - MS COCO is the standard pretraining benchmark for modern real-time object detectors including YOLOv8.
  - Class 0 (`person`) provides baseline detection for pedestrians, commuters, and children in diverse urban contexts.
  - Pretrained detection provides an immediate zero-shot baseline to assess detector latency and localization before domain fine-tuning.

---

## 3. Verified Classes

The baseline detector model provides predictions across 80 COCO categories, mapped at runtime as follows:

### Primary VRU Detection Classes
| Class ID | Class Name | Relevance to VRU Safety |
| :---: | :--- | :--- |
| **0** | `person` | **Primary VRU Target**: Pedestrians, children near roads, jaywalkers, sidewalk commuters |
| **1** | `bicycle` | **VRU Target**: Cyclists sharing road space with transit vehicles |
| **3** | `motorcycle` | **VRU Target**: Two-wheeler operators navigating urban bus lanes |

### Relevant Context / Vehicle Classes
| Class ID | Class Name | Relevance to Transit Context |
| :---: | :--- | :--- |
| **2** | `car` | Surrounding passenger vehicles |
| **5** | `bus` | Transit buses / fleet context |
| **7** | `truck` | Heavy commercial vehicles |
| **9** | `traffic light` | Intersection signaling context |
| **11** | `stop sign` | Priority and right-of-way context |

### Complete 80-Class Index (Verified from Model Runtime)
`0: person`, `1: bicycle`, `2: car`, `3: motorcycle`, `4: airplane`, `5: bus`, `6: train`, `7: truck`, `8: boat`, `9: traffic light`, `10: fire hydrant`, `11: stop sign`, `12: parking meter`, `13: bench`, `14: bird`, `15: cat`, `16: dog`, `17: horse`, `18: sheep`, `19: cow`, `20: elephant`, `21: bear`, `22: zebra`, `23: giraffe`, `24: backpack`, `25: umbrella`, `26: handbag`, `27: tie`, `28: suitcase`, `29: frisbee`, `30: skis`, `31: snowboard`, `32: sports ball`, `33: kite`, `34: baseball bat`, `35: baseball glove`, `36: skateboard`, `37: surfboard`, `38: tennis racket`, `39: bottle`, `40: wine glass`, `41: cup`, `42: fork`, `43: knife`, `44: spoon`, `45: bowl`, `46: banana`, `47: apple`, `48: sandwich`, `49: orange`, `50: broccoli`, `51: carrot`, `52: hot dog`, `53: pizza`, `54: donut`, `55: cake`, `56: chair`, `57: couch`, `58: potted plant`, `59: bed`, `60: dining table`, `61: toilet`, `62: tv`, `63: laptop`, `64: mouse`, `65: remote`, `66: keyboard`, `67: cell phone`, `68: microwave`, `69: oven`, `70: toaster`, `71: sink`, `72: refrigerator`, `73: book`, `74: clock`, `75: vase`, `76: scissors`, `77: teddy bear`, `78: hair drier`, `79: toothbrush`.

---

## 4. Model Baseline

The baseline perception model utilizes **YOLOv8n** (Nano variant) released by Ultralytics:
- **Architecture**: Anchor-free CNN object detector with C2f feature extractors and decoupled head
- **Weights File**: `yolov8n.pt` (Pretrained on MS COCO train2017)
- **Model Size**: ~6.2 MB
- **Parameters**: 3,157,200 (3.2M params)
- **Default Input Resolution**: 640 × 640 pixels
- **Inference Device for Checkpoint**: CPU (Windows AMD64)
- **Architecture Rationale**: Ultra-lightweight footprint suitable for low-power edge compute units (e.g. onboard bus edge hardware like NVIDIA Jetson Nano / Orin Nano or x86 CPU units) while preserving high recall on the `person` class.

---

## 5. Environment & Setup Commands

The environment was verified on **Python 3.13.1 (64-bit AMD64) on Windows**.

### Actual Installed & Verified Runtime Package Versions:
- **Python**: `3.13.1`
- **torch**: `2.14.0+cpu`
- **torchvision**: `0.29.0+cpu`
- **ultralytics**: `8.4.140`
- **opencv-python**: `5.0.0.93` (cv2 `5.0.0`)
- **pillow**: `12.3.0`
- **numpy**: `2.5.2`
- **pyyaml**: `6.0.3`

### Setup Instructions

```bash
# 1. Ensure Python 3.13.1 is active
python --version

# 2. Install exact pinned dependencies
pip install -r ml/vru/requirements.txt

# 3. Verify runtime imports
python -c "import torch, torchvision, ultralytics, cv2, PIL, numpy, yaml; print('All VRU packages imported successfully.')"
```

---

## 6. Baseline Inference Command

To run baseline inference on the sample verification test set:

```bash
python ml/vru/baseline_inference.py --source data/samples/vru/test_set --weights yolov8n.pt --conf 0.25 --output-json data/samples/vru/baseline_results.json
```

Arguments:
- `--source`: Path to input image or directory of images (default: `data/samples/vru/test_set`)
- `--weights`: Weights file name or path (default: `yolov8n.pt`)
- `--conf`: Detection confidence threshold (default: `0.25`)
- `--output-json`: Optional path to persist structured benchmark results

---

## 7. Actual Baseline Results

Six verified test images from official COCO subsets were evaluated on CPU. Note: Raw model confidence scores are recorded directly as output by the detector and are **not** conflated with empirical precision/recall.

| Test Image | Sample Type | Scene Provenance | VRU Detections Observed | Context Detections | Measured Latency (Pre / Inf / Post) | Pass / Fail | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `pos_bus_transit_street.jpg` | Positive | Official Ultralytics benchmark sample (`bus.jpg`) | `person` (0.87), `person` (0.85), `person` (0.83), `person` (0.26) | `bus` (0.87), `stop sign` (0.26) | 3.5ms / **104.1ms** / 1.1ms | **PASS** | Transit bus and pedestrians alongside roadway clearly localized simultaneously. |
| `pos_coco_pedestrian_umbrella.jpg` | Positive | COCO 2017 val `000000000036.jpg` | `person` (0.91) | `umbrella` (0.77) | 1.9ms / **111.6ms** / 1.2ms | **PASS** | Outdoor pedestrian carrying umbrella detected with high localization confidence. |
| `pos_coco_pedestrians_outdoor.jpg` | Positive | COCO 2017 val `000000000049.jpg` | `person` (0.47), `person` (0.40), `person` (0.31), `person` (0.26) | `potted plant` (0.70), `horse` (0.67), `dog` (0.58) | 3.1ms / **74.1ms** / 2.1ms | **PASS** | Multiple distant persons detected; lower confidence observed on small/occluded bounding boxes. |
| `neg_coco_animal_suitcase.jpg` | Negative | COCO 2017 val `000000000042.jpg` | None (0 VRUs) | `suitcase` (0.49), `dog` (0.26) | 3.0ms / **117.1ms** / 2.0ms | **PASS** | Correctly rejected false person detections. Only non-VRU context detected. |
| `neg_coco_food_setting.jpg` | Negative | COCO 2017 train `000000000009.jpg` | None (0 VRUs) | `bowl` (0.92, 0.55, 0.45, 0.30), `broccoli` (0.66) | 101.5ms / **84.9ms** / 1.3ms | **PASS** | Table scene without persons. Zero false positive person detections. |
| `neg_coco_wildlife_scene.jpg` | Negative | COCO 2017 train `000000000034.jpg` | None (0 VRUs) | `zebra` (0.93) | 1.9ms / **103.0ms** / 1.7ms | **PASS** | Outdoor wildlife scene without persons. Zero false positive person detections. |

### Measured Latency Summary (CPU Execution)
- **Average Inference Latency**: **99.12 ms** (~10.1 FPS)
- **Minimum Inference Latency**: **74.10 ms** (~13.5 FPS)
- **Maximum Inference Latency**: **117.07 ms** (~8.5 FPS)
- **Average Preprocessing Latency**: 19.15 ms (first image warmup included)
- **Average Postprocessing Latency**: 1.57 ms

---

## 8. Known Limitations

The pretrained YOLOv8n baseline has several documented limitations that must be addressed in subsequent checkpoints:

1. **No Spatial / Proximity Metric**: The model outputs 2D pixel bounding boxes (`xyxy`) in camera coordinates. It cannot directly measure physical metric distance (meters) to the bus without camera calibration or monocular depth estimation.
2. **No Temporal Tracking**: Bounding boxes are generated per-frame independently. Without an object tracker (e.g. ByteTrack or BoT-SORT), direction of pedestrian motion, walking trajectory, and time-to-collision cannot be computed.
3. **Occlusion & Scale Sensitivity**: As demonstrated in `pos_coco_pedestrians_outdoor.jpg`, distant or partially occluded pedestrians produce lower confidence scores (0.26 – 0.47) that may fall below aggressive confidence thresholds.
4. **General Domain Bias**: Pretrained COCO weights are trained on general web images, not exclusively on frontal windshield perspective dashcam/transit camera views.
5. **No Risk Stratification**: The model classifies objects as `person`, but does not evaluate whether the pedestrian is on a safe sidewalk vs. actively jaywalking into the bus trajectory.

---

## 9. Next Planned Checkpoint: VRU-2

Following baseline verification in VRU-1, **Checkpoint VRU-2** will focus on:
1. **Fine-Tuning Dataset Selection & Curation**: Evaluating transit-specific datasets (e.g. Cityscapes, BDD100K, or local bus video extractions) for fine-tuning the detector specifically on urban street geometries.
2. **Spatial Reasoning Heuristic Design**: Developing a transparent bounding-box heuristic based on image location, bottom-edge proximity, and lane corridor geometry to estimate proximity to the bus.
3. **Temporal Tracking Integration**: Incorporating lightweight multi-object tracking to calculate approach velocity and trajectory vectors across consecutive frames.
4. **Adapter Interface Alignment**: Implementing `VRUAdapter` mapping raw detector + heuristic outputs into the canonical `CanonicalDetection` contract (`shared/schemas/detection.schema.json`).

---

## 10. Checkpoint VRU-3: BDD100K Fine-Tuning

> **Status**: Scripts prepared — awaiting BDD100K download and user approval before training.  
> **Branch**: `feature/vru-safety-ai`

### VRU-3 Objective

Fine-tune YOLOv8n on BDD100K using the class mapping approved in VRU-2 to produce a
measurable, reproducible baseline VRU detector for the transit bus camera perspective.

### GPU Environment (VRU-3)

| Item | Value |
| :--- | :--- |
| GPU | NVIDIA GeForce RTX 3050 Laptop GPU |
| VRAM | 4.0 GB |
| CUDA version | 12.6 |
| PyTorch | 2.14.0+cu126 |
| torchvision | 0.29.0+cu126 |

### VRU-3 Target Classes

| YOLO Class ID | Class Name | BDD100K Source |
| :---: | :--- | :--- |
| `0` | `person` | `pedestrian` + `rider` (merged) |
| `1` | `bicycle` | `bicycle` |
| `2` | `motorcycle` | `motor` |

All other BDD100K categories (`car`, `truck`, `bus`, `train`, `traffic light`, `traffic sign`) are discarded.

### Files Created in VRU-3

| File | Purpose |
| :--- | :--- |
| `ml/vru/tools/bdd100k_to_yolo.py` | Converts BDD100K JSON annotations to YOLO format |
| `ml/vru/tools/sanity_check.py` | Visual sanity check — draws boxes on sample images |
| `ml/vru/tools/train.py` | Launches the approved baseline fine-tuning run |
| `ml/vru/tools/evaluate.py` | Evaluates best.pt on BDD100K val split |
| `ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml` | YOLO dataset config (regenerated by conversion script) |
| `ml/vru/configs/train_vru3_baseline.yaml` | Approved training configuration |
| `ml/vru/runs/vru3_baseline/metrics.md` | Final metrics report (written after training) |

### BDD100K Download (Manual Step Required)

Register and download from: https://bdd-data.berkeley.edu

Required archives:

```
bdd100k_images_det_20.zip
bdd100k_det_20_labels_trainval.zip
```

After extraction, the BDD100K root must contain:

```
<bdd100k-root>/
+-- images/
|   +-- 100k/
|       +-- train/          (70,000 .jpg images)
|       +-- val/            (10,000 .jpg images)
+-- labels/
    +-- det_20/
        +-- det_train.json
        +-- det_val.json
```

### Step-by-Step Reproduction Commands

**Step 1 — Convert annotations:**

```powershell
python ml/vru/tools/bdd100k_to_yolo.py --bdd100k-root <PATH-TO-BDD100K>
```

The script will:
- Verify the annotation file format matches BDD100K det_20
- Print per-category raw counts
- Apply the class mapping (pedestrian/rider → person, bicycle → bicycle, motor → motorcycle)
- Write YOLO label files to `<bdd100k-root>/labels/100k/train/` and `val/`
- Print the conversion report (train count, val count, per-class counts, discarded, malformed)
- Write `ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml` with the correct absolute path
- **Halt with exit code 1** if malformed annotation rate > 1%, any class has zero annotations,
  or > 20% of images are missing from disk

Optional dry-run (no files written):
```powershell
python ml/vru/tools/bdd100k_to_yolo.py --bdd100k-root <PATH> --dry-run
```

**Step 2 — Sanity check (human review required):**

```powershell
python ml/vru/tools/sanity_check.py --bdd100k-root <PATH-TO-BDD100K>
```

Opens 20 train + 10 val images with YOLO boxes drawn on them.
Saved to `ml/vru/runs/sanity_check/`.

Colour key: `green = person` | `cyan = bicycle` | `orange = motorcycle`

**You must visually inspect these images before proceeding to training.**

**Step 3 — Training (do NOT run until Steps 1-2 pass):**

```powershell
python ml/vru/tools/train.py
```

Or equivalently via the Ultralytics CLI:

```powershell
yolo train model=yolov8n.pt ^
  data=ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml ^
  epochs=20 imgsz=640 batch=8 device=0 seed=42 ^
  optimizer=auto project=ml/vru/runs name=vru3_baseline ^
  save=true save_period=5 val=true plots=true
```

**Step 4 — Evaluation:**

```powershell
python ml/vru/tools/evaluate.py
```

Or with custom weights path:

```powershell
python ml/vru/tools/evaluate.py --weights ml/vru/runs/vru3_baseline/weights/best.pt
```

Writes all measured metrics to `ml/vru/runs/vru3_baseline/metrics.md`.

### Training Configuration Summary

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| Model | `yolov8n.pt` (COCO pretrained) | 3.2M parameters |
| `epochs` | `20` | Baseline run |
| `batch` | `8` | Conservative for 4 GB VRAM |
| `imgsz` | `640` | YOLOv8n native resolution |
| `device` | `0` | CUDA GPU 0 |
| `seed` | `42` | Reproducibility |
| `optimizer` | `auto` → **MuSGD** | Resolved at runtime (175K iterations > 10K threshold) |
| `lr0` | `0.01` | Auto-set by MuSGD selection |
| `momentum` | `0.9` | Auto-set by MuSGD selection |
| `weight_decay` | `0.0005` | Default |

> **Note on `optimizer=auto`**: This resolves to **MuSGD** (Muon optimizer) for this job,
> not SGD and not AdamW. The `lr0` and `momentum` config values are **ignored** when
> `optimizer=auto`; MuSGD sets them to `0.01` and `0.9` respectively.
> The training log will confirm: `optimizer: MuSGD(lr=0.01, momentum=0.9)`.

### Output Artifacts

After training:

```
ml/vru/runs/vru3_baseline/
+-- weights/
|   +-- best.pt           <- best checkpoint (git-ignored)
|   +-- last.pt           <- final checkpoint (git-ignored)
+-- results.csv           <- epoch-by-epoch metrics
+-- results.png           <- training curve plot
+-- val_batch*_pred.jpg   <- validation predictions (visual)
+-- metrics.md            <- full VRU-3 metrics report
```

### What Is NOT Done in VRU-3

- No VRU Adapter (`VRUAdapter`) — reserved for a later checkpoint
- No Edge Orchestrator modifications
- No backend / frontend / Supabase changes
- No custom bus-camera data mixed into training
- No hyperparameter sweeps or second training runs
- No risk scoring, tracking, or spatial reasoning

Custom bus-camera footage is reserved as a **domain validation set** for a future checkpoint.

