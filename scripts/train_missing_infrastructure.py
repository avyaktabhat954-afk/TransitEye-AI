#!/usr/bin/env python3
"""
TransitEye — Person 3 Missing Infrastructure Training Script
Trains a YOLOv8n object detection model for Missing Infrastructure hazards.
"""

import os
import sys
import shutil
import argparse
from typing import Optional
from ultralytics import YOLO


def parse_args():
    parser = argparse.ArgumentParser(description="TransitEye Person 3 — Missing Infrastructure Training")
    parser.add_argument("--data-yaml", required=True, help="Path to missing infrastructure dataset data.yaml")
    parser.add_argument("--epochs", type=int, default=25, help="Number of training epochs (default: 25)")
    parser.add_argument("--imgsz", type=int, default=320, help="Input image size (default: 320)")
    parser.add_argument("--batch-size", type=int, default=32, help="Training batch size (default: 32)")
    parser.add_argument("--workers", type=int, default=0, help="Dataloader workers (default: 0)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument("--device", default="cpu", help="Device for execution ('cpu', '0', etc.)")
    parser.add_argument("--model", default="yolov8n.pt", help="Pretrained base model weights (default: yolov8n.pt)")
    parser.add_argument("--project", default="runs/experiments", help="YOLO run project folder")
    parser.add_argument("--name", default="p3_missing_infra_exp1", help="YOLO run experiment name")
    parser.add_argument("--weights-dir", default="ml/missing_infrastructure/weights", help="Destination weights directory")
    return parser.parse_args()


def train_missing_infrastructure(args):
    data_yaml_path = os.path.abspath(args.data_yaml)
    if not os.path.exists(data_yaml_path):
        print(f"ERROR: Dataset YAML not found at: {data_yaml_path}")
        sys.exit(1)

    print("==================================================")
    print("TransitEye P3: YOLOv8n Missing Infrastructure Training")
    print("==================================================")
    print(f"Dataset config: {data_yaml_path}")
    print(f"Model Base: {args.model}")
    print(f"Image size: {args.imgsz}x{args.imgsz}")
    print(f"Epochs: {args.epochs}")
    print(f"Batch size: {args.batch_size}")
    print(f"Seed: {args.seed}")
    print(f"Device: {args.device}")
    print(f"Run project: {args.project}")
    print(f"Run name: {args.name}")
    print(f"Target weights directory: {args.weights-dir}")
    print("==================================================")

    model = YOLO(args.model)

    results = model.train(
        data=data_yaml_path,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch_size,
        workers=args.workers,
        seed=args.seed,
        deterministic=True,
        device=args.device,
        project=args.project,
        name=args.name,
        exist_ok=True,
        plots=True,
        save=True
    )

    # Copy output weights to module weights directory
    weights_dir = os.path.abspath(args.weights_dir)
    os.makedirs(weights_dir, exist_ok=True)

    run_save_dir = getattr(model.trainer, "save_dir", None)
    if run_save_dir:
        best_pt = os.path.join(run_save_dir, "weights", "best.pt")
        last_pt = os.path.join(run_save_dir, "weights", "last.pt")

        if os.path.exists(best_pt):
            dest_best = os.path.join(weights_dir, "best.pt")
            shutil.copyfile(best_pt, dest_best)
            print(f"\nCopied best weights to: {dest_best}")

        if os.path.exists(last_pt):
            dest_last = os.path.join(weights_dir, "last.pt")
            shutil.copyfile(last_pt, dest_last)
            print(f"Copied last weights to: {dest_last}")

    print("\nTraining completed successfully.")
    return results


if __name__ == "__main__":
    args = parse_args()
    train_missing_infrastructure(args)
