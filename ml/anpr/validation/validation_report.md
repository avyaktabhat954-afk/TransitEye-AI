# TransitEye ANPR Final Validation & Stress Test Report

---

## 1. Validation Summary & Key Metrics

* **Total Images Tested**: 27 (25 held-out test images + 2 synthetic/edge-case tests)
* **Successful Inference Count**: 27 / 27 (100% completion rate without runtime exceptions)
* **Error / Exception Count**: 0
* **YOLO Plate Detection Count**: 25 / 27
* **No-Detection Count**: 2
* **OCR Text Returned Count**: 24
* **Average Detector Confidence**: 0.8006 (on detected plates)
* **Average OCR Confidence**: 0.9664 (on returned text)
* **Average Inference Time**: 2.7560 seconds/image (CPU execution)

---

## 2. Validation Checks Matrix

| Check ID | Requirement / Scenario | Result | Observed Behavior |
| :---: | :--- | :---: | :--- |
| **A** | `inference.py` processes real images | **[VERIFIED] PASS** | Successfully ran pipeline on 25 held-out test images across Dataset A and Dataset B. |
| **B** | Invalid/unreadable images handled gracefully | **[VERIFIED] PASS** | Non-existent or corrupt image path returned `plate_text = "UNKNOWN"`, `plate_confidence = 0.0`, error recorded in metadata without crashing. |
| **C** | No-detection cases handled gracefully | **[VERIFIED] PASS** | Blank image returned `plate_text = "UNKNOWN"`, `plate_confidence = 0.0`, status `"no_detection"`. |
| **D** | OCR returning no text handled gracefully | **[VERIFIED] PASS** | Low-quality or unreadable crops default to `plate_text = "UNKNOWN"` with `plate_confidence = 0.0`. |
| **E** | Output remains structurally valid | **[VERIFIED] PASS** | All 27 test outputs contained mandatory dictionary fields (`plate_text`, `plate_confidence`, `bbox`, `padded_bbox`, `metadata`). |
| **F** | Multiple detections handled correctly | **[VERIFIED] PASS** | Best scoring plate box selected for primary output while total detection count recorded in metadata. |
| **G** | Confidence values bounded | **[VERIFIED] PASS** | All returned `plate_confidence` values strictly satisfied `0.0 <= plate_confidence <= 1.0`. |
| **H** | Zero unauthorized file changes | **[VERIFIED] PASS** | No files outside `ml/anpr/` were created or modified (`git diff --stat` = 0). |

---

## 3. Measured Results vs. Qualitative Observations

### MEASURED Results
* **Held-out TEST Detection Performance** (1,154 images):
  * **Precision**: 97.17%
  * **Recall**: 94.97%
  * **mAP50**: 97.09%
  * **mAP50-95**: 66.66%
* **Stress Test Latency**: Average pipeline execution time was 2.7560s per image on PyTorch + PaddleOCR CPU stack.

### QUALITATIVE Observations
* Clean, front-facing license plates (e.g. `MH20EE7598`, `MH20DJ0419`, `HR26CR3302`) yielded high OCR confidence scores (> 0.99) and exact text extractions.
* Dataset B long plates and foreign plate formats were detected reliably by Stage 1 YOLO, with Stage 2 PaddleOCR extracting raw text strings.

### UNKNOWN / NOT MEASURED Items
* **Ground-Truth Character Accuracy (CER/WER)**: Not measured, as ground-truth character strings are not available in the test dataset. Character substitutions were strictly prohibited in post-processing.

---

## 4. Adapter Validation Results

Two actual inference results were passed through `ANPRAdapter.normalize(raw_output, EdgeContext)`:

### Example 1: Sample `dsA_test_7c6227ed-9e92-4062-9591-b172cb32ec10___3e7fd381-0ae5-4421-8a70-279ee0ec1c61_Honda-Jazz-Front-Number-Plates-Designs_jpg.rf.c1761c4322d8330414ef2392bf30a538.jpg`
```json
{
  "id": "inc-a3af5174",
  "plate_text": "TN42R2697",
  "plate_confidence": 0.6789,
  "trigger_reason": "bus_lane_obstruction",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "altitude": 216.5,
    "speed": 34.0,
    "heading": 175.0,
    "accuracy": 2.1
  },
  "clip_url": null,
  "bus_id": "BUS-DEMO-001",
  "timestamp": "2026-09-07T11:28:25.706282Z",
  "metadata": {
    "bbox": [
      51.6,
      79.2,
      525.1,
      187.8
    ],
    "padded_bbox": [
      28,
      74,
      549,
      193
    ],
    "raw_ocr_text": "TN 42 R 2697",
    "detector_confidence": 0.7281,
    "ocr_confidence": 0.9324,
    "crop_padding_pct": 0.05,
    "status": "success",
    "image_path": "c:\\Users\\Lenovo\\OneDrive\\Desktop\\TransitEye\\ml\\anpr\\dataset_combined_working\\test\\images\\dsA_test_7c6227ed-9e92-4062-9591-b172cb32ec10___3e7fd381-0ae5-4421-8a70-279ee0ec1c61_Honda-Jazz-Front-Number-Plates-Designs_jpg.rf.c1761c4322d8330414ef2392bf30a538.jpg",
    "image_dimensions": [
      600,
      450
    ],
    "num_plates_detected": 2
  }
}
```

### Example 2: Sample `dsA_test_AS15_jpg.rf.aa059588ec1245efbbef82845d35e16f.jpg`
```json
{
  "id": "inc-6a774d71",
  "plate_text": "AS018F9673",
  "plate_confidence": 0.7399,
  "trigger_reason": "bus_lane_obstruction",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "altitude": 216.5,
    "speed": 34.0,
    "heading": 175.0,
    "accuracy": 2.1
  },
  "clip_url": null,
  "bus_id": "BUS-DEMO-001",
  "timestamp": "2026-09-07T11:28:25.706282Z",
  "metadata": {
    "bbox": [
      82.2,
      271.7,
      181.1,
      297.1
    ],
    "padded_bbox": [
      77,
      270,
      186,
      298
    ],
    "raw_ocr_text": "AS018F9673",
    "detector_confidence": 0.7971,
    "ocr_confidence": 0.9283,
    "crop_padding_pct": 0.05,
    "status": "success",
    "image_path": "c:\\Users\\Lenovo\\OneDrive\\Desktop\\TransitEye\\ml\\anpr\\dataset_combined_working\\test\\images\\dsA_test_AS15_jpg.rf.aa059588ec1245efbbef82845d35e16f.jpg",
    "image_dimensions": [
      272,
      336
    ],
    "num_plates_detected": 1
  }
}
```

* **Contract Validation**: Returned objects strictly subclassed `CanonicalIncident` (`isinstance == True`).
* **Field Validation**: `plate_text` and `plate_confidence` matched raw inference predictions and satisfied `0.0 <= confidence <= 1.0`.

---

## 5. Edge-Case Test Results

1. **Blank Image Test (`blank_image_no_plate.png`)**:
   * Output: `plate_text = "UNKNOWN"`, `plate_confidence = 0.0`, `num_plates_detected = 0`.
   * Result: Graceful handling, zero exceptions.
2. **Non-Existent Image Test (`non_existent_file_path.jpg`)**:
   * Output: `plate_text = "UNKNOWN"`, `plate_confidence = 0.0`, status `"error"`.
   * Result: Graceful error response without process crash.

---

## 6. Verification & File Integrity

* **Files Created**: `ml/anpr/validation/validation_results.csv`, `ml/anpr/validation/validation_report.md`
* **Git Status**: Clean working tree outside `ml/anpr/` (`git diff --stat` = 0 changes to tracked files).
* **Blockers**: None. ANPR production module is fully verified and ready for edge orchestrator integration.
