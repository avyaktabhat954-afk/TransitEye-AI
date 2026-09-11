#!/usr/bin/env python3
"""
TransitEye Person 3 — Road Defect Detection Training Script
Checkpoint: P3-4 (YOLOv8n Experimentation Framework)

Configuration:
- Model: YOLOv8n (pretrained: yolov8n.pt)
- Dataset: data/processed/road_defects/data.yaml
- Target classes:
    0: longitudinal_crack
    1: transverse_crack
    2: alligator_crack
    3: pothole
- Image size: 320x320 (configured due to CPU hardware execution constraints)
- Epochs: 3 (default baseline) or configurable via CLI
- Batch size: 32
- Workers: 2
- Random seed: 42
- Optimizer: auto (AdamW baseline)
"""

import argparse
import os
import shutil
from pathlib import Path
import time
from ultralytics import YOLO


def parse_args():
    parser = argparse.ArgumentParser(description="TransitEye Road Defect Detection Training Script")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs (default: 3)")
    parser.add_argument("--imgsz", type=int, default=320, help="Image size for training and validation (default: 320)")
    parser.add_argument("--project", type=str, default="runs/baseline", help="Project directory for runs (default: runs/baseline)")
    parser.add_argument("--name", type=str, default="yolov8n_road_defects", help="Run name (default: yolov8n_road_defects)")
    parser.add_argument("--weights-dir", type=str, default=None, help="Directory to save output best/last weights (default: ml/road_defects/weights)")
    parser.add_argument("--overwrite-global-weights", action="store_true", help="Overwrite global weights in ml/road_defects/weights/")
    parser.add_argument("--data-yaml", type=str, default=None, help="Path to custom data.yaml (default: data/processed/road_defects/data.yaml)")
    parser.add_argument("--d10-weight", type=float, default=1.0, help="Classification loss weight multiplier for D10 / transverse_crack (default: 1.0)")
    return parser.parse_args()


def train_road_defects(epochs=3, imgsz=320, project="runs/baseline", name="yolov8n_road_defects", weights_dir=None, overwrite_global_weights=False, data_yaml_path=None, d10_weight=1.0):
    repo_root = Path(__file__).resolve().parent.parent
    if data_yaml_path is None:
        data_yaml = repo_root / "data" / "processed" / "road_defects" / "data.yaml"
    else:
        data_yaml = Path(data_yaml_path)
        if not data_yaml.is_absolute():
            data_yaml = repo_root / data_yaml
    
    if weights_dir is None:
        target_weights_dir = repo_root / "ml" / "road_defects" / "weights"
    else:
        target_weights_dir = Path(weights_dir)
        if not target_weights_dir.is_absolute():
            target_weights_dir = repo_root / target_weights_dir
            
    target_weights_dir.mkdir(parents=True, exist_ok=True)

    print("==================================================")
    print(f"TransitEye P3: YOLOv8n Road Defect Training [{name}]")
    print("==================================================")
    print(f"Dataset config: {data_yaml}")
    print("Model: YOLOv8n (yolov8n.pt)")
    print(f"Image size: {imgsz}x{imgsz}")
    print(f"Epochs: {epochs}")
    print("Batch size: 32")
    print("Seed: 42")
    print("Device: cpu")
    print(f"D10 Class Weight: {d10_weight}")
    print(f"Run project: {repo_root / project}")
    print(f"Run name: {name}")
    print(f"Target weights directory: {target_weights_dir}")
    print("==================================================")

    start_time = time.time()
    model = YOLO("yolov8n.pt")

    if float(d10_weight) != 1.0:
        def set_d10_class_weights(trainer):
            import torch
            weights = torch.tensor([1.0, float(d10_weight), 1.0, 1.0], device=trainer.device)
            model_obj = trainer.model.module if hasattr(trainer.model, "module") else trainer.model
            model_obj.class_weights = weights
            print(f"\n[CRITERION VERIFIED] Set trainer.model.class_weights = {weights.tolist()}")

        model.add_callback("on_pretrain_routine_end", set_d10_class_weights)

    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=32,
        workers=2,
        seed=42,
        device="cpu",
        project=str(repo_root / project),
        name=name,
        exist_ok=True,
        save=True,
        plots=True,
        deterministic=True
    )

    training_duration = time.time() - start_time
    print(f"\nTraining completed in {training_duration:.2f} seconds ({training_duration/60:.2f} minutes).")

    # Copy best and last weights to target weights dir
    run_dir = Path(results.save_dir) if hasattr(results, "save_dir") else repo_root / project / name
    src_best = run_dir / "weights" / "best.pt"
    src_last = run_dir / "weights" / "last.pt"

    if src_best.exists():
        shutil.copy2(src_best, target_weights_dir / "best.pt")
        print(f"Copied best weights to: {target_weights_dir / 'best.pt'}")
        if overwrite_global_weights:
            global_weights = repo_root / "ml" / "road_defects" / "weights"
            global_weights.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_best, global_weights / "best.pt")
            print(f"Overwrote global best weights at: {global_weights / 'best.pt'}")

    if src_last.exists():
        shutil.copy2(src_last, target_weights_dir / "last.pt")
        print(f"Copied last weights to: {target_weights_dir / 'last.pt'}")
        if overwrite_global_weights:
            global_weights = repo_root / "ml" / "road_defects" / "weights"
            global_weights.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_last, global_weights / "last.pt")
            print(f"Overwrote global last weights at: {global_weights / 'last.pt'}")

    # Evaluate validation metrics
    print("\nRunning post-training validation evaluation...")
    eval_weight = target_weights_dir / "best.pt" if (target_weights_dir / "best.pt").exists() else src_best
    best_model = YOLO(str(eval_weight))
    val_results = best_model.val(
        data=str(data_yaml),
        imgsz=imgsz,
        batch=32,
        device="cpu",
        split="val"
    )

    print("\nValidation results summary:")
    print(f"mAP50: {val_results.results_dict.get('metrics/mAP50(B)', 0.0):.4f}")
    print(f"mAP50-95: {val_results.results_dict.get('metrics/mAP50-95(B)', 0.0):.4f}")
    print(f"Precision: {val_results.results_dict.get('metrics/precision(B)', 0.0):.4f}")
    print(f"Recall: {val_results.results_dict.get('metrics/recall(B)', 0.0):.4f}")

    return results, val_results


if __name__ == "__main__":
    args = parse_args()
    train_road_defects(
        epochs=args.epochs,
        imgsz=args.imgsz,
        project=args.project,
        name=args.name,
        weights_dir=args.weights_dir,
        overwrite_global_weights=args.overwrite_global_weights,
        data_yaml_path=args.data_yaml,
        d10_weight=args.d10_weight
    )

