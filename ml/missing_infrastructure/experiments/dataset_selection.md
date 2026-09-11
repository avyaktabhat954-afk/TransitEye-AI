# TransitEye Person 3 — Missing Infrastructure Dataset Selection Specification

> **STATUS**: `PIVOT EVALUATION COMPLETE — ACQUISITION BLOCKED FOR QUALITY DEFECT DATA`  
> **Document Location**: `ml/missing_infrastructure/experiments/dataset_selection.md`  

---

## 1. Objective
Identify, evaluate, and select a legally compliant, publicly accessible, and technically suitable object detection dataset for TransitEye's **Roadside Infrastructure Defect Detection** (`ml/missing_infrastructure/`) module using the **YOLOv8n** architecture.

---

## 2. Pivot Dataset Search Strategy

Following the initial acquisition blocker on Smartathon, three primary candidate categories were investigated for direct, unauthenticated download access:

1. **Candidate 1 — Damaged Road Signs** (`nick-g857q/damaged-road-sign-detection`)
   - Webpage: Roboflow Universe (1,677 images, CC BY 4.0, YOLOv8 format).
   - Unauthenticated Access: `BLOCKED` (Roboflow Universe requires account authentication/API key for zip export).

2. **Candidate 2 — Streetlight Defect Datasets**
   - Search across public hubs (Hugging Face, Zenodo, GitHub) for damaged/faulty streetlights.
   - Smartathon Audit: `BAD_STREETLIGHT` contains only 1 bounding box annotation in total across the entire dataset (`VERIFIED`).
   - Alternative repos (`lonlonago`, `RBoabeng`): Require $89 Stripe paywall or `ROBOFLOW_API_KEY`.
   - Access: `BLOCKED / INSUFFICIENT DATA`.

3. **Candidate 3 — Other Infrastructure Defect Datasets** (`tahaUgan/pothole-sewage-manhole-yolo` on Hugging Face)
   - Format: YOLO PyTorch object detection (`train`, `valid`, `test`, `data.yaml`).
   - License: CC BY 4.0 (`PUBLICLY STATED`).
   - Unauthenticated Access: `VERIFIED` (Direct HTTP download accessible).
   - Classes: `0: Pothole`, `1: Sewage-Manhole`.
   - Semantic Assessment: `Pothole` directly duplicates P3 Road Defects (`potholes`, `cracks`). `Sewage-Manhole` labels standard intact manhole covers rather than structural defect states.

---

## 3. Comprehensive Dataset Candidate Evaluation Matrix

| Candidate Dataset | Source / Publisher | Download Method | Auth Required | Format | Bounding Boxes | Infrastructure Defect Match | Status / Verdict |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Damaged Road Sign** (`nick-g857q`) | Roboflow Universe | API Zip Export | Yes (`ROBOFLOW_API_KEY`) | YOLOv8 | Yes | High (`damaged_sign`, `healthy`) | `BLOCKED` (Auth Required) |
| **Streetlight Defects** (Smartathon / Repos) | SDAIA / GitHub | Web / Stripe / API | Yes | Various | Yes | High (in concept), but 1 box in Smartathon | `BLOCKED / INSUFFICIENT DATA` |
| **Pothole & Sewage Manhole** (`tahaUgan`) | Hugging Face | Direct HTTP | No | YOLOv8 | Yes | Low (Intact manholes & pothole duplicate) | `REJECTED — SEMANTIC MISMATCH` |
| **Road Issues Detection** (`Programmer-RD-AI`) | Hugging Face | Direct HTTP | No | Classification Folders | **No** | Medium | `REJECTED — NO BOUNDING BOXES` |

---

## 4. Class Balance & Selection Rules

1. **Smartathon 3-Class Mapping Retired**: The previous mapping (`broken_signage`, `bad_streetlight`, `faded_signage`) is retired because `BAD_STREETLIGHT` has only 1 annotation across the Smartathon dataset.
2. **P3 Module Isolation**: Pothole and pavement crack classes are assigned exclusively to P3 Road Defects and must not be duplicated in Missing Infrastructure.
3. **Defect State Verification**: Only datasets providing explicit bounding boxes for damaged/defective infrastructure states (`damaged_sign`, `broken_pole`) are acceptable.

---

## 5. Current Module Status

- **Acquisition Status**: `DATASET ACQUISITION BLOCKED`
- **Training Status**: `NOT RUN` (Model training is strictly paused until a verified, defensible bounding-box defect dataset is acquired).


