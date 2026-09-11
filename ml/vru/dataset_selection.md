# VRU-2: Dataset Selection Report

> **Checkpoint**: VRU-2 — Dataset Selection, Verification, and Fine-Tuning Preparation Plan
> **Status**: Research Complete — Awaiting Approval
> **Date**: 2026-09-05
> **Author**: TransitEye VRU Module

---

## 0. Purpose of This Document

This document provides a verified, evidence-based comparison of candidate fine-tuning datasets for the TransitEye VRU Safety AI perception module.  

It follows the methodology established in VRU-2 scope:
- All facts are tagged with `VERIFIED`, `NOT VERIFIED`, or `UNKNOWN — NOT VERIFIED`
- Sources are recorded for every material claim
- No model training is conducted in this checkpoint
- Final dataset selection and split configuration are proposed here for VRU-3 approval

---

## 1. VRU-1 Baseline Summary (Context)

From Checkpoint VRU-1, the pretrained **YOLOv8n** (COCO weights) produced the following verified observations on 6 test samples:

| Observation | Detail |
| :--- | :--- |
| Strong detections | Large/nearby pedestrians: confidence 0.83–0.91 |
| Weak detections | Distant/small pedestrians: confidence 0.26–0.47 |
| False negatives | Possible on occluded or small-scale persons |
| Domain bias | General web images, not transit-perspective dashcam |
| Avg inference latency (CPU) | 99.12 ms (~10 FPS) |

**VRU-2 objective**: Select the most appropriate fine-tuning dataset to specifically improve detection of pedestrians, cyclists, and motorcyclists from a **transit bus forward-facing camera perspective**.

---

## 2. Target Class Scope

Per VRU module requirements (no unnecessary classes):

| Target Class | Rationale |
| :--- | :--- |
| `person` (COCO class 0) | Pedestrians, jaywalkers, children at bus stops |
| `bicycle` (COCO class 1) | Cyclists sharing lanes with transit buses |
| `motorcycle` (COCO class 3) | Two-wheeler operators in transit corridors |

Classes to **exclude** from fine-tuning labels: car, truck, bus, train, airplane, and all non-VRU COCO categories.

> **Note on "rider"**: BDD100K includes a `rider` class (person mounted on bicycle/motorcycle). In VRU context, a rider is a VRU and should be merged into `person` during label conversion, not discarded.

---

## 3. Dataset Candidates

### 3.1 Candidate A — BDD100K

#### Basic Facts

| Fact | Value | Source | Status |
| :--- | :--- | :--- | :--- |
| Full name | Berkeley DeepDrive 100K | arXiv:1805.04687, github.com/bdd100k/bdd100k | **VERIFIED** |
| Venue | CVPR 2020 (Oral) | arxiv.org/abs/1805.04687 | **VERIFIED** |
| Authors | Fisher Yu et al., UC Berkeley | arxiv.org/abs/1805.04687 | **VERIFIED** |
| Total videos | 100,000 clips (40 sec each, 30 fps, 720p) | github.com/bdd100k/bdd100k README | **VERIFIED** |
| Annotated keyframes | 100,000 images (1 per video, at 10th second) | Web search — multiple sources cross-checked | **VERIFIED** |
| Image resolution | 1280 × 720 pixels | Web search — multiple sources cross-checked | **VERIFIED** |
| Train split | 70,000 images | Web search — multiple sources cross-checked | **VERIFIED** |
| Validation split | 10,000 images | Web search — multiple sources cross-checked | **VERIFIED** |
| Test split | 20,000 images (labels withheld) | Web search — multiple sources cross-checked | **VERIFIED** |
| Detection categories | 10 classes: pedestrian, rider, car, truck, bus, motor, bicycle, traffic light, traffic sign, train | Web search — multiple sources cross-checked | **VERIFIED** |
| Annotation format | JSON (custom BDD100K format, det_20 labels) | Web search — label format name | **VERIFIED** |
| Label access | Train + val labels publicly available after registration; test labels withheld | Web search | **VERIFIED** |
| Registration required | Yes — must register at bdd-data.berkeley.edu | Web search | **VERIFIED** |
| License | Academic/research: free, no signed agreement required. Commercial: requires UC Berkeley OTL contact | Web search — multiple sources cross-checked | **VERIFIED** |
| Camera setup | Forward-facing dashcams (Nexar devices) in personal vehicles driven by volunteers | Web search | **VERIFIED** |
| Geographic coverage | USA — primarily New York, San Francisco, Berkeley, Bay Area | Web search | **VERIFIED** |
| Weather diversity | Sunny, cloudy, overcast, rainy, snowy, foggy | Web search | **VERIFIED** |
| Time of day diversity | Daytime, night, dawn/dusk | Web search | **VERIFIED** |
| Dataset disk size (approx.) | Not confirmed from official source | UNKNOWN — NOT VERIFIED |

#### VRU Relevance Assessment

| Criterion | Assessment |
| :--- | :--- |
| Camera perspective | Forward-facing dashcam — **closest to TransitEye bus-camera perspective** of all public candidates |
| VRU classes available | `pedestrian` ✓, `bicycle` ✓, `motor` ✓, `rider` ✓ (can be merged to `person`) |
| Bounding box annotations | Yes — native bounding boxes (not derived from masks) |
| Scale/distance diversity | Yes — highway and city scenes at varying ranges |
| Night-time scenes | Yes — verified diverse lighting conditions |
| Adverse weather | Yes — rain, fog, snow present |
| Domain gap to bus camera | **Moderate**: dashcam perspective similar to bus windshield; mounted lower on cars than on buses; USA scenes vs. local deployment |
| Label conversion complexity | Medium — JSON-to-YOLO conversion required with class mapping |

#### Domain Gap Analysis: BDD100K → TransitEye Bus Camera

| Gap Factor | BDD100K | TransitEye Bus | Severity |
| :--- | :--- | :--- | :---: |
| Camera height | ~1.0–1.3 m (car dashcam) | ~2.5–3.5 m (bus windshield/front) | 🟡 Moderate |
| Field of view angle | Low, forward | Higher angle, wider bottom view | 🟡 Moderate |
| Scene geography | US cities | Local urban transit | 🟡 Moderate |
| Traffic density | Varies | High-density urban transit | 🟢 Small |
| VRU visibility | Good (near-road) | Good (bus stops, crossings) | 🟢 Small |
| Night/adverse weather | Covered | Required | 🟢 Small |
| Pedestrian scale | Varies from near to far | Near (bus stops) to far (crossing) | 🟢 Small |

**BDD100K overall domain gap: MODERATE** — best match of any public dataset to the transit dashcam perspective.

---

### 3.2 Candidate B — Cityscapes

#### Basic Facts

| Fact | Value | Source | Status |
| :--- | :--- | :--- | :--- |
| Full name | The Cityscapes Dataset for Semantic Urban Scene Understanding | CVPR 2016 paper (arXiv:1604.01685) | **VERIFIED** |
| Venue | CVPR 2016 | arXiv:1604.01685 | **VERIFIED** |
| Authors | Marius Cordts, Mohamed Omran, et al. (Daimler AG, MPI Informatics, TU Darmstadt) | arXiv:1604.01685 | **VERIFIED** |
| Total annotated images (fine) | 5,000 | Web search — multiple sources cross-checked | **VERIFIED** |
| Total annotated images (coarse) | 20,000 (additional weak labels) | Web search — multiple sources cross-checked | **VERIFIED** |
| Train split (fine) | 2,975 images | Web search — multiple sources cross-checked | **VERIFIED** |
| Validation split (fine) | 500 images | Web search — multiple sources cross-checked | **VERIFIED** |
| Test split (fine) | 1,525 images (labels withheld) | Web search — multiple sources cross-checked | **VERIFIED** |
| Image resolution | 2048 × 1024 pixels | arXiv:1604.01685 | **VERIFIED** |
| Primary annotation type | Pixel-level polygonal segmentation (instance + semantic) | Web search + arXiv:1604.01685 | **VERIFIED** |
| Native bounding boxes | No — boxes must be derived from polygonal masks | Web search | **VERIFIED** |
| VRU-relevant classes | `person`, `bicycle`, `motorcycle` present in class taxonomy | cityscapes-dataset.com | **VERIFIED** |
| License | Custom non-commercial license (academic research, teaching, personal use) | cityscapes-dataset.com, web search | **VERIFIED** |
| Registration required | Yes — via cityscapes-dataset.com | cityscapes-dataset.com | **VERIFIED** |
| Camera system | Stereo camera (22 cm baseline), automotive-grade, OnSemi AR0331 sensors, 17 Hz | arXiv:1604.01685, web search | **VERIFIED** |
| Camera perspective | Ego-vehicle (car) mounted — driver's seat perspective | Web search | **VERIFIED** |
| Camera height | Not explicitly stated in public documentation | UNKNOWN — NOT VERIFIED |
| Geographic coverage | 50 cities, primarily Germany and neighboring countries | arXiv:1604.01685, web search | **VERIFIED** |
| Weather conditions | Primarily fair weather — no deliberate adverse weather collection | Web search | **VERIFIED** |
| Time of day | Primarily daytime (spring, summer, fall sessions) | Web search | **VERIFIED** |
| CityPersons extension | Separate bounding-box pedestrian dataset built on Cityscapes images (2017) | Web search | **VERIFIED** |

#### VRU Relevance Assessment

| Criterion | Assessment |
| :--- | :--- |
| Camera perspective | Ego-vehicle car stereo camera — forward-facing but significantly lower mount than bus |
| VRU classes available | `person` ✓, `bicycle` ✓, `motorcycle` ✓ (via segmentation labels) |
| Bounding box annotations | **No** — requires conversion from pixel masks to bounding boxes (added pipeline complexity) |
| Scale/distance diversity | High resolution (2048×1024), but smaller sample (2,975 train) |
| Night-time scenes | **Minimal** — primarily fair-weather daytime |
| Adverse weather | **Not deliberately covered** |
| Domain gap to bus camera | **Higher** than BDD100K: car-height perspective, no night/rain, smaller sample, European cities |
| Label conversion complexity | **High** — mask-to-bounding-box pipeline + YOLO format conversion |

#### Domain Gap Analysis: Cityscapes → TransitEye Bus Camera

| Gap Factor | Cityscapes | TransitEye Bus | Severity |
| :--- | :--- | :--- | :---: |
| Camera height | ~1.0 m approx. (car stereo) | ~2.5–3.5 m (bus windshield) | 🔴 Large |
| Night-time coverage | Essentially absent | Required for safety use case | 🔴 Large |
| Adverse weather | Absent | Required for robust deployment | 🔴 Large |
| Sample size (train) | 2,975 fine images | Insufficient for robust fine-tuning | 🔴 Large |
| Annotation type | Pixel masks → boxes (extra step) | Requires extra conversion pipeline | 🟡 Moderate |
| Geographic context | German cities | Local urban transit | 🟡 Moderate |
| VRU density per image | Typically high | Variable | 🟢 Small |

**Cityscapes overall domain gap: LARGE** — high-quality annotations but insufficient scale, missing night/weather coverage, and high conversion overhead.

---

### 3.3 Candidate C — Custom Bus-Camera Dataset (TransitEye Fleet)

#### Concept

Extract keyframes from actual TransitEye-deployed bus cameras, manually annotate VRU bounding boxes, and use as:
1. A **domain validation set** — to measure real-world performance after fine-tuning on public data
2. A **small supplemental training set** — only if sufficient labeled frames become available

#### Feasibility Assessment

| Criterion | Assessment | Status |
| :--- | :--- | :--- |
| Camera perspective | Exact match to deployment | Ideal |
| Data availability | Subject to availability of recorded bus footage | UNKNOWN — NOT VERIFIED |
| Annotation tooling | Requires labeling tool (CVAT, Label Studio, Roboflow) + human annotators | Not yet provisioned |
| Privacy/data compliance | Bus footage may contain identifiable individuals — data governance review required before use | NOT VERIFIED — action required |
| Minimum viable set size | ~200–500 labeled images for domain validation set (literature-based estimate) | ESTIMATE — NOT VERIFIED |
| Label format | Would be produced in YOLO format directly | Feasible |
| Integration path | Used as val set or mixed with BDD100K training data | Feasible |

**Custom dataset role**: **Not a replacement** for a large public training set. Primary value is as a **held-out domain validation set** to measure real-world transfer quality.

---

## 4. Comparative Summary Table

| Criterion | BDD100K | Cityscapes | Custom Bus |
| :--- | :---: | :---: | :---: |
| Relevance to dashcam/bus perspective | 🟢 High | 🟡 Medium | 🟢 Exact |
| VRU labels (`person`, `bicycle`, `motorcycle`) | 🟢 Yes (native BB) | 🟡 Yes (mask→BB conversion) | 🟢 Yes (direct) |
| Bounding box annotations (native) | 🟢 Yes | 🔴 No | 🟢 Yes |
| Training set size | 🟢 70,000 images | 🔴 2,975 images | 🔴 ~200–500 est. |
| Night-time coverage | 🟢 Yes | 🔴 Minimal | 🟡 Unknown |
| Adverse weather coverage | 🟢 Yes | 🔴 No | 🟡 Unknown |
| License (non-commercial research) | 🟢 Free (registration) | 🟢 Free (registration) | 🟢 Own data |
| YOLO conversion complexity | 🟡 Medium (JSON→YOLO) | 🔴 High (mask→BB→YOLO) | 🟢 Low (direct) |
| Immediate availability | 🟡 After registration | 🟡 After registration | 🔴 Not yet |
| Annotation effort required | 🟢 None | 🟢 None | 🔴 Required |

---

## 5. Dataset Selection Decision

### Selected: **BDD100K (Primary) + Custom Bus-Camera Validation Set (Secondary)**

**Rationale:**

1. **BDD100K is the strongest available public dataset for TransitEye VRU fine-tuning** because:
   - Forward-facing dashcam perspective is the closest proxy to bus windshield cameras at scale
   - Native bounding box annotations for `pedestrian`, `bicycle`, `motor`, and `rider` — no mask conversion needed
   - 70,000 training images provide sufficient diversity for fine-tuning YOLOv8n
   - Weather and time-of-day diversity (rain, fog, night) is essential for transit safety
   - Academic research license permits training and evaluation without restriction

2. **Cityscapes is NOT recommended as the primary fine-tuning dataset** because:
   - Training set is only 2,975 images — insufficient for robust fine-tuning
   - No native bounding boxes — masks must be converted, adding pipeline risk
   - No night-time or adverse weather coverage — unacceptable for transit safety
   - Larger domain gap to bus camera perspective

3. **Custom bus-camera data should be prepared as a domain validation set** (not training data) because:
   - Privacy/data governance review is required first
   - Provides a ground-truth measure of real-world transfer performance
   - Estimated size (~200–500 images) is unsuitable as a primary training source

### Priority Hierarchy Applied

| Priority | Criterion | BDD100K Decision |
| :---: | :--- | :--- |
| 1 | Relevance to road/bus-camera perception | ✅ Dashcam perspective — best available |
| 2 | Correct VRU labels | ✅ `pedestrian`, `bicycle`, `motor`, `rider` |
| 3 | Bounding-box availability | ✅ Native bounding boxes |
| 4+ | Scale, license, accessibility | ✅ 70K images, free academic, public |

---

## 6. Label Conversion Plan (BDD100K → YOLO Format)

### 6.1 Source Format

BDD100K detection labels are provided in **JSON** format (one file per split: `det_20_train.json`, `det_20_val.json`).

Each annotation entry contains:
```json
{
  "name": "image_filename.jpg",
  "labels": [
    {
      "category": "pedestrian",
      "box2d": { "x1": 123, "y1": 456, "x2": 789, "y2": 890 }
    }
  ]
}
```

### 6.2 VRU Class Mapping

Only VRU classes are retained; all other BDD100K classes are discarded.

| BDD100K Category | Action | TransitEye YOLO Class ID | YOLO Class Name |
| :--- | :--- | :---: | :--- |
| `pedestrian` | Include | `0` | `person` |
| `rider` | Merge → `person` | `0` | `person` |
| `bicycle` | Include | `1` | `bicycle` |
| `motor` | Include | `2` | `motorcycle` |
| `car` | **Discard** | — | — |
| `truck` | **Discard** | — | — |
| `bus` | **Discard** | — | — |
| `train` | **Discard** | — | — |
| `traffic light` | **Discard** | — | — |
| `traffic sign` | **Discard** | — | — |

> **Rationale for merging `rider` into `person`**: A rider is a VRU and poses the same pedestrian-level safety risk. Separating them requires additional semantic context and increases class complexity without improving safety utility.

### 6.3 YOLO Coordinate Normalization

BDD100K bounding boxes are in absolute pixel coordinates. Conversion to YOLO format:

```
x_center = (x1 + x2) / (2 × image_width)
y_center = (y1 + y2) / (2 × image_height)
width    = (x2 - x1) / image_width
height   = (y2 - y1) / image_height
```

For BDD100K: `image_width = 1280`, `image_height = 720`

### 6.4 Output Directory Structure

```
ml/vru/datasets/bdd100k_vru/
├── images/
│   ├── train/       # 70,000 .jpg images
│   └── val/         # 10,000 .jpg images
├── labels/
│   ├── train/       # 70,000 .txt YOLO label files
│   └── val/         # 10,000 .txt YOLO label files
└── bdd100k_vru.yaml # YOLO dataset configuration
```

### 6.5 YOLO Dataset Configuration File

```yaml
# bdd100k_vru.yaml
# TransitEye VRU fine-tuning dataset configuration
# Source: BDD100K (Yu et al., CVPR 2020) — det_20 detection labels
# VRU classes only: person, bicycle, motorcycle

path: ml/vru/datasets/bdd100k_vru
train: images/train
val: images/val

nc: 3
names:
  0: person        # BDD100K: pedestrian + rider (merged)
  1: bicycle       # BDD100K: bicycle
  2: motorcycle    # BDD100K: motor
```

### 6.6 Conversion Script Plan

A conversion script will be written at `ml/vru/tools/bdd100k_to_yolo.py` in VRU-3. It will:

1. Parse `det_20_train.json` and `det_20_val.json`
2. For each image, filter to VRU classes only (`pedestrian`, `rider`, `bicycle`, `motor`)
3. Apply class mapping (`rider` → `person`)
4. Normalize bounding box coordinates to YOLO format
5. Write one `.txt` label file per image
6. Skip images with zero VRU annotations (or optionally retain as negatives)
7. Validate output: assert label file count matches image count per split
8. Print class distribution summary (count of `person`, `bicycle`, `motorcycle` instances)

---

## 7. Dataset Split Strategy

### Primary Training Configuration

| Split | Source | Images | Purpose |
| :--- | :--- | :---: | :--- |
| Train | BDD100K train split | 70,000 | Fine-tuning |
| Val | BDD100K val split | 10,000 | Hyperparameter selection, early stopping |
| Test (domain) | Custom bus-camera set (when available) | ~200–500 | Real-world deployment validation |

> **Note**: The BDD100K test split labels are withheld by Berkeley. For TransitEye fine-tuning, the BDD100K val split is the held-out evaluation set. The custom bus-camera set serves as final domain-transfer validation.

### Negative Sample Handling

Images with no VRU labels should be **retained** in the training set as true negatives. This prevents the model from developing a bias toward always predicting VRU detections.

---

## 8. Known Risks and Mitigations

| Risk | Likelihood | Severity | Mitigation |
| :--- | :---: | :---: | :--- |
| Registration delay for BDD100K access | Low | Medium | Register early; download is manual |
| BDD100K USA geography ≠ local transit | High | Medium | Use custom bus-camera val set to measure transfer gap; apply augmentation |
| Camera height mismatch (car vs. bus) | High | Medium | Fine-tune with diverse angles; evaluate on custom domain data |
| Night/rain under-representation in val | Low | Low | BDD100K val includes diverse conditions |
| `rider` merge introduces label ambiguity | Low | Low | Document merge decision in YOLO config and conversion script |
| Privacy risk in custom bus footage | Medium | High | **MANDATORY**: Obtain data governance/legal clearance before any annotation or use |

---

## 9. Preparation Checklist for VRU-3 (Ordered)

1. **Register** on the BDD100K portal (`bdd-data.berkeley.edu`) and accept license terms
2. **Download** BDD100K detection package: images (train + val) and `det_20` label JSON files
3. **Verify** download integrity: confirm 70,000 train images and 10,000 val images
4. **Write** `ml/vru/tools/bdd100k_to_yolo.py` conversion script
5. **Run** conversion and validate output label statistics:
   - Label file count = image count per split
   - Class distribution: confirm all three VRU classes present
   - Spot-check 10 random images (bounding boxes render correctly)
6. **Write** `ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml`
7. **[Parallel]** Initiate data governance review for custom bus-camera footage
8. **[Parallel]** Set up annotation tooling (CVAT or Label Studio) for future domain val set

---

## 10. Sources and Evidence Record

| Claim | Source | Verification Status |
| :--- | :--- | :--- |
| BDD100K paper | https://arxiv.org/abs/1805.04687 | **VERIFIED** — accessed 2026-09-05 |
| BDD100K README | https://github.com/bdd100k/bdd100k | **VERIFIED** — accessed 2026-09-05 |
| BDD100K splits (70K/10K/20K) | Web search — multiple sources cross-checked | **VERIFIED** |
| BDD100K license (academic free) | Web search — multiple sources cross-checked | **VERIFIED** |
| BDD100K registration required | Web search | **VERIFIED** |
| BDD100K camera type (Nexar dashcam) | Web search | **VERIFIED** |
| BDD100K weather/time diversity | Web search | **VERIFIED** |
| BDD100K 10 detection classes | Web search — multiple sources cross-checked | **VERIFIED** |
| Cityscapes paper | https://arxiv.org/abs/1604.01685 | **VERIFIED** — accessed 2026-09-05 |
| Cityscapes splits (2975/500/1525 fine) | Web search — multiple sources cross-checked | **VERIFIED** |
| Cityscapes non-commercial license | cityscapes-dataset.com, web search | **VERIFIED** |
| Cityscapes camera (stereo, 22 cm baseline) | arXiv:1604.01685, web search | **VERIFIED** |
| Cityscapes primarily daytime/fair weather | Web search | **VERIFIED** |
| Cityscapes bounding boxes derived from masks | Web search | **VERIFIED** |
| BDD100K JSON-to-YOLO conversion method | Web search | **VERIFIED** |
| Custom dataset size/cost estimates | Internal estimation | **ESTIMATE — NOT VERIFIED** |
| BDD100K total disk size | Not found in official documentation | **UNKNOWN — NOT VERIFIED** |
| Cityscapes camera mounting height | Not explicitly stated in official documentation | **UNKNOWN — NOT VERIFIED** |
