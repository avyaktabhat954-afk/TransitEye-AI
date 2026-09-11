# TransitEye Person 3 — India-Specific Infrastructure Dataset Audit & Strategy

> **STATUS**: `NO EXISTING INDIAN DEFECT DATASET — DRIVEINDIA ANNOTATION FALLBACK`  
> **Document Location**: `ml/missing_infrastructure/experiments/india_dataset_audit.md`  

---

## 1. Executive Summary

This report documents the dataset feasibility audit for acquiring and manually annotating a high-quality Indian infrastructure defect subset from **DriveIndia** (TiHAN - IIT Hyderabad) for TransitEye's **Roadside Infrastructure Defect Detection** (`ml/missing_infrastructure/`) module.

DriveIndia contains **66,986 real Indian road images** with 2D bounding boxes across 24 object categories. However, DriveIndia contains **0 explicit infrastructure defect annotations** (`damaged_sign`, `broken_pole`). Extensive searches confirmed that **no public, legally accessible bounding-box dataset containing explicit Indian roadside infrastructure defects currently exists**.

---

## 2. DriveIndia Official License & Access Audit (Phase 1 & 2)

- **Publisher / Host**: TiHAN - IIT Hyderabad (Rishav Kumar, D. Santhosh Reddy, P. Rajalakshmi) (`VERIFIED` via arXiv:2507.19912).
- **Official Access Portal**: `https://tihan.iith.ac.in/TiAND.html` (`VERIFIED`).
- **Official Download Process**: Download TiHAN EULA form (`drive.google.com/file/d/1uiYwkWlsnX0okoNNG_jiWHftfTGZZj-7`), sign and upload via Google Form (`docs.google.com/forms/d/e/1FAIpQLScKpnmiWM3-zXr8FeWzg8Lkk-AbRrNJlt1eCAEMoObmufneJw`), receive download link via email (`VERIFIED`).
- **Publisher License**: `CC BY-NC-ND 4.0` (Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International) (`PUBLICLY STATED`).
- **License Terms Analysis**:
  - *NonCommercial (NC)*: Internal academic, hackathon, and educational model training is permitted. Commercial deployment requires an explicit commercial agreement.
  - *NoDerivatives (ND)*: Users may create internal annotation labels and train internal model weights. However, **public redistribution of modified dataset image packages or derived annotations is strictly prohibited** without publisher consent.
  - *Attribution (BY)*: Required to cite TiHAN-IIT Hyderabad (`arXiv:2507.19912`).
- **License Verdict**: `LICENSE PERMISSION — UNKNOWN — REQUIRES PUBLISHER CONFIRMATION` for public redistribution of modified annotations; internal model training for non-commercial research is permitted (`VERIFIED`).

---

## 3. DriveIndia Defect Prevalence & Annotation Feasibility Audit (Phases 3, 4, 5)

- **Total Indian Road Images**: **66,986 images** (`PUBLICLY STATED`).
- **Source DriveIndia Defect Annotations**: **0 images** (`VERIFIED`).
- **DriveIndia Defect Prevalence**: `DRIVEINDIA DEFECT PREVALENCE = UNKNOWN` (`NOT MEASURED LOCALLY — REQUIRES LOCAL IMAGE SAMPLE AUDIT`).
- **Speculative Estimate Policy**: Speculative unverified estimates (e.g., 2–5% defect rate) are rejected as evidence for dataset readiness.
- **Candidate Indian Defect Classes (Pending Audit)**:
  1. `damaged_sign` (damaged, bent, or broken traffic/street signs)
  2. `tilted_sign` (severely leaning or misaligned sign posts)
  3. `faded_sign` (weathered or illegible signage)
  4. `damaged_barrier` (toppled or broken temporary traffic barriers)

---

## 4. Recommended Multi-Dataset Architecture (Phase 8)

1. **Dataset A (Indian Domain Foundation)**: **DriveIndia** (66,986 images). Teaches the model Indian road background scenes, illumination, weather, traffic density, and standard Indian roadside asset detection (`traffic_sign`, `traffic_light`, `route_board`, `barrier`).
2. **Dataset B (Indian Defect Fallback Annotation Corpus)**: Manually annotated DriveIndia defect subset, subject to a local image sample prevalence audit and publisher EULA approval.
3. **Dataset C (Supplementary Condition Pretraining)**: **WHU-Infra3D** (5,449 images, 175,021 boxes). Teaches the model fine-grained infrastructure defect/damage attributes (`damaged`, `broken`, `non_working`, `tilted`).
4. **Dataset D (Held-Out Indian Test Set)**: Curated held-out test set of **real Indian road imagery** containing annotated defect instances. Final evaluation metrics must be calculated strictly on Indian road data.

---

## 5. Model Architecture & Task Formulation (Phase 9)

- **Formulation**: **Option A — Two-Stage Architecture**
  - **Stage 1 (Asset Detector)**: YOLOv8n trained on DriveIndia + WHU-Infra3D to detect Indian roadside infrastructure assets (`traffic_sign`, `street_light`, `signal_light`, `route_board`).
  - **Stage 2 (Condition Classifier)**: Secondary classifier evaluating cropped bounding boxes for condition states (`intact`, `damaged`, `broken`, `tilted`, `faulty`).
- **Policy**: Model training remains strictly paused (`NOT RUN`) until dataset strategy and EULA approval.
