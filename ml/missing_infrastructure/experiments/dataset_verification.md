# TransitEye Person 3 — Missing Infrastructure Dataset Acquisition & Verification Report

> **STATUS**: `DATASET ACQUISITION BLOCKED`  
> **Document Location**: `ml/missing_infrastructure/experiments/dataset_verification.md`  

---

## 1. Executive Summary

This report documents the dataset acquisition and verification attempts for Candidate 1 (Damaged Road Signs), Candidate 2 (Streetlight Defects), and Candidate 3 (Other Infrastructure Defects) for TransitEye's **Roadside Infrastructure Defect Detection** (`ml/missing_infrastructure/`) module.

Publicly accessible object detection datasets with bounding boxes were evaluated. Candidate 1 (`nick-g857q/damaged-road-sign-detection`) and Candidate 2 require user authentication credentials or paywall payment, while candidate public datasets on open hubs either lack bounding box annotations or label intact infrastructure rather than defect states.

---

## 2. Candidate Acquisition Results

### Candidate 1 — Damaged Road Signs (`nick-g857q/damaged-road-sign-detection`)
- **Source**: Roboflow Universe (`https://universe.roboflow.com/nick-g857q/damaged-road-sign-detection`)
- **Publicly Stated Stats**: 1,677 images, Object Detection, classes: `healthy`, `damaged`, License: CC BY 4.0, split: 100% train / 0% val / 0% test.
- **Unauthenticated Acquisition Attempt**: `BLOCKED` (Roboflow Universe requires account login/signup credentials or `ROBOFLOW_API_KEY` for export download).

### Candidate 2 — Streetlight Defects
- **Source Search**: Smartathon dataset, Zenodo, Hugging Face, GitHub (`lonlonago`, `RBoabeng`).
- **Data Quality Audit**: Audit of Smartathon class distribution revealed that `BAD_STREETLIGHT` has only **1 bounding-box annotation** in total across the entire dataset (`VERIFIED`).
- **Alternative Sources**: Require $89 Stripe paywall or user API keys.
- **Acquisition Status**: `BLOCKED / INSUFFICIENT DATA`

### Candidate 3 — Other Infrastructure Defects (`tahaUgan/pothole-sewage-manhole-yolo`)
- **Source**: Hugging Face (`tahaUgan/pothole-sewage-manhole-yolo`)
- **License**: CC BY 4.0 (`PUBLICLY STATED`)
- **Acquisition**: Direct HTTP download accessible (`VERIFIED`)
- **Format**: YOLOv8 PyTorch (`VERIFIED`)
- **Class Breakdown**: `0: Pothole`, `1: Sewage-Manhole` (`VERIFIED`)
- **Data Audit Results**: Sampling 50 label files yielded 120 `Pothole` boxes and 17 `Sewage-Manhole` boxes (`MEASURED`). `Pothole` directly duplicates P3 Road Defects, while `Sewage-Manhole` labels standard intact manhole covers rather than structural defect states (`VERIFIED`).
- **Acquisition Status**: `REJECTED — SEMANTIC & MODULE MISMATCH`

---

## 3. Class Selection & Balance Rules

- **Smartathon Class Mapping**: Retired due to single-instance class imbalance (`BAD_STREETLIGHT` = 1 annotation).
- **Module Boundaries**: Potholes and road surface cracks are strictly reserved for P3 Road Defects.
- **Semantic Distinction**: Detection models identify visible defect states (`damaged_sign`, `broken_pole`), not asset absence (`missing_sign`), which relies on GIS road segment asset cross-referencing.

---

## 4. Current Provenance & Verification Status

- **Local Disk Status**: `DATASET STATUS: UNKNOWN / NOT PRESENT — DEPLOYABLE DEFECT DATASET PENDING`
- **Training Status**: `NOT RUN` (Training is strictly paused until a verified, defensible bounding-box defect dataset is acquired).
