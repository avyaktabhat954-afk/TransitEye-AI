#!/usr/bin/env python3
"""
TransitEye P3 Missing Infrastructure — Phase 3A Training Smoke Test
===================================================================

This script performs a fast 1-epoch training smoke test for the P3 Missing Infrastructure
YOLOv8n model using the canonical dataset at data/processed/p3_missing_infrastructure/dataset.yaml.

THIS IS A SMOKE TEST ONLY — NOT THE FINAL 25-EPOCH EXPERIMENT.
"""

import os
import sys
import time
import json
from ultralytics import YOLO

def main():
    print("=" * 70)
    print("TRANSITEYE P3 MISSING INFRASTRUCTURE — TRAINING PIPELINE SMOKE TEST")
    print("=" * 70)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    yaml_path = os.path.join(base_dir, "data", "processed", "p3_missing_infrastructure", "dataset.yaml")
    weights_path = os.path.join(base_dir, "yolov8n.pt")

    if not os.path.exists(yaml_path):
        print(f"ERROR: Dataset YAML not found at {yaml_path}")
        sys.exit(1)

    if not os.path.exists(weights_path):
        print(f"ERROR: Pretrained weights not found at {weights_path}")
        sys.exit(1)

    print(f"Dataset YAML: {yaml_path}")
    print(f"Pretrained Weights: {weights_path}\n")

    # Initialize YOLO model
    start_init = time.time()
    model = YOLO(weights_path)
    init_time = time.time() - start_init
    print(f"YOLOv8n model initialized successfully in {init_time:.2f} seconds.")

    # Execute 1-epoch smoke test with fraction=0.01 for fast verification
    start_train = time.time()
    results = model.train(
        data=yaml_path,
        epochs=1,
        imgsz=640,
        batch=16,
        fraction=0.01,
        project=os.path.join(base_dir, "runs", "smoke_test"),
        name="p3_missing_infra_smoketest",
        exist_ok=True,
        seed=42,
        device="cpu",
        workers=0,
        plots=False,
        save=False,
        val=True
    )
    total_duration = time.time() - start_train

    # Calculate estimated runtime for full dataset (594 batches * per-batch time)
    # fraction=0.01 ran 6 batches (~95 images). Extrapolate per-batch time to 594 batches.
    batches_run = 6
    time_per_batch = total_duration / batches_run
    est_epoch_full = time_per_batch * 594
    est_25_epochs_full_sec = est_epoch_full * 25

    print("\n" + "=" * 70)
    print("SMOKE TEST RESULTS — NOT FINAL MODEL RESULTS")
    print("=" * 70)
    print(f"Smoke Test Duration (fraction=0.01, 6 batches): {total_duration:.2f} seconds")
    print(f"Measured Time per Batch: {time_per_batch:.2f} seconds/batch")
    print(f"Hardware Used: CPU (Intel Core i5-5350U)")
    print(f"Batch Size: 16")
    print(f"Image Size: 640")
    print(f"Validation Executed: YES")
    print(f"ESTIMATED Full 1-Epoch Runtime on CPU: {est_epoch_full / 60:.2f} minutes")
    print(f"ESTIMATED Full 25-Epoch Runtime on CPU: {est_25_epochs_full_sec / 60:.2f} minutes ({est_25_epochs_full_sec / 3600:.2f} hours)")
    print("=" * 70)

if __name__ == "__main__":
    main()
