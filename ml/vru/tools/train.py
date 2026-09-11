"""
TransitEye VRU Safety AI -- YOLOv8n Fine-Tuning Script
Checkpoint VRU-3

Runs the single approved baseline fine-tuning job using the configuration
defined in ml/vru/configs/train_vru3_baseline.yaml.

Prerequisites (script verifies all before starting):
  1. CUDA GPU available (will NOT fall back to CPU silently)
  2. Pretrained weights present (yolov8n.pt at project root)
  3. Training config present (ml/vru/configs/train_vru3_baseline.yaml)
  4. Dataset YAML present (ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml)
  5. YOLO label directories present (run bdd100k_to_yolo.py first)

Usage:
    python ml/vru/tools/train.py

    Optional:
    --config  Path to training YAML config
              (default: ml/vru/configs/train_vru3_baseline.yaml)
"""

import argparse
import sys
import time
from pathlib import Path

import yaml


PRETRAINED_WEIGHTS  = Path("yolov8n.pt")
DEFAULT_CONFIG_PATH = Path("ml/vru/configs/train_vru3_baseline.yaml")
STARTUP_DELAY_SEC   = 5    # countdown before training starts


# ---- Prerequisite verification -----------------------------------------------

def verify_prerequisites(config_path, cfg):
    """
    Check all prerequisites before launching training.
    Prints a clear error and exits with code 1 on any failure.
    """
    import torch

    errors = []

    # GPU check -- hard requirement, no CPU fallback
    if not torch.cuda.is_available():
        errors.append(
            "CUDA is not available.\n"
            "  GPU training is required for VRU-3. Cannot proceed.\n"
            "  Install a CUDA-enabled PyTorch build first:\n"
            "    pip install torch==2.14.0+cu126 torchvision==0.29.0+cu126 "
            "--index-url https://download.pytorch.org/whl/cu126"
        )
    else:
        gpu_name  = torch.cuda.get_device_name(0)
        vram_gb   = torch.cuda.get_device_properties(0).total_memory / 1024 ** 3
        cuda_ver  = torch.version.cuda
        torch_ver = torch.__version__
        print("[GPU]     {} | {:.1f} GB VRAM | CUDA {} | torch {}".format(
            gpu_name, vram_gb, cuda_ver, torch_ver
        ))

    # Pretrained weights
    if not PRETRAINED_WEIGHTS.exists():
        errors.append(
            "Pretrained weights not found: {}\n"
            "  Run from the project root so yolov8n.pt is discoverable,\n"
            "  or download it with: python -c \"from ultralytics import YOLO; YOLO('yolov8n.pt')\"".format(
                PRETRAINED_WEIGHTS
            )
        )
    else:
        sz_mb = PRETRAINED_WEIGHTS.stat().st_size / 1024 ** 2
        print("[Weights] {} ({:.1f} MB)".format(PRETRAINED_WEIGHTS, sz_mb))

    # Training config
    if not config_path.exists():
        errors.append("Training config not found: {}".format(config_path))
    else:
        print("[Config]  {}".format(config_path))

    # Dataset YAML
    data_yaml_path = Path(cfg.get("data", ""))
    if not data_yaml_path.exists():
        errors.append(
            "Dataset YAML not found: {}\n"
            "  Run ml/vru/tools/bdd100k_to_yolo.py first.".format(data_yaml_path)
        )
    else:
        print("[Dataset] {}".format(data_yaml_path))
        # Check label directories inside the dataset YAML
        with open(data_yaml_path, "r", encoding="utf-8") as fh:
            ds_cfg = yaml.safe_load(fh)
        bdd100k_root = Path(ds_cfg.get("path", ""))
        for split_name, rel_path in (("train", "labels/100k/train"), ("val", "labels/100k/val")):
            label_dir = bdd100k_root / rel_path
            if not label_dir.exists():
                errors.append(
                    "[{}] Label directory not found: {}\n"
                    "  Run ml/vru/tools/bdd100k_to_yolo.py first.".format(
                        split_name.upper(), label_dir
                    )
                )
            else:
                n_labels = sum(1 for _ in label_dir.glob("*.txt"))
                print("[Labels]  {} ({:,} .txt files)".format(label_dir, n_labels))

    if errors:
        print()
        for err in errors:
            for line in err.split("\n"):
                print("  [FATAL] {}".format(line))
        print()
        sys.exit(1)

    print()
    print("[OK] All prerequisites verified.")


# ---- Training ----------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="TransitEye VRU-3: Run the approved YOLOv8n baseline fine-tuning job."
    )
    parser.add_argument(
        "--config",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to training YAML config (default: {}).".format(DEFAULT_CONFIG_PATH),
    )
    args = parser.parse_args()

    config_path = Path(args.config)

    print("=" * 62)
    print("  TransitEye VRU-3: YOLOv8n Baseline Fine-Tuning")
    print("  Checkpoint VRU-3 | Single controlled baseline run")
    print("=" * 62)
    print("  Config  : {}".format(config_path))
    print("  Weights : {}".format(PRETRAINED_WEIGHTS))
    print()

    # Load config
    if not config_path.exists():
        print("  [FATAL] Training config not found: {}".format(config_path))
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh)

    # Verify prerequisites
    verify_prerequisites(config_path, cfg)

    # Print resolved configuration
    print()
    print("[Training parameters]")
    skip_keys = {"model"}  # model is set via YOLO() constructor, not kwargs
    for k, v in cfg.items():
        if k not in skip_keys:
            print("  {:20s}: {}".format(k, v))

    print()
    print("  NOTE: optimizer=auto resolves to MuSGD (lr=0.01, momentum=0.9)")
    print("  NOTE: lr0/momentum config values are IGNORED when optimizer=auto")
    print("  NOTE: MuSGD applies Muon orthogonalized updates to weight matrices")

    # Countdown before training starts
    print()
    print("=" * 62)
    print("  Starting training in {} seconds. Press Ctrl+C to abort.".format(STARTUP_DELAY_SEC))
    print("=" * 62)
    for remaining in range(STARTUP_DELAY_SEC, 0, -1):
        print("  {}...".format(remaining), end="\r", flush=True)
        time.sleep(1)
    print()

    # Import here to avoid slow startup on bad prerequisites
    from ultralytics import YOLO

    # Build kwargs -- pass all config except 'model' (already set via constructor)
    train_kwargs = {k: v for k, v in cfg.items() if k != "model" and v is not None}

    t_start = time.time()
    model   = YOLO(str(PRETRAINED_WEIGHTS))
    results = model.train(**train_kwargs)
    t_end   = time.time()

    duration_min = (t_end - t_start) / 60.0
    duration_hrs = duration_min / 60.0

    project   = cfg.get("project", "ml/vru/runs")
    name      = cfg.get("name",    "vru3_baseline")
    best_pt   = Path(project) / name / "weights" / "best.pt"
    last_pt   = Path(project) / name / "weights" / "last.pt"

    print()
    print("=" * 62)
    print("  TRAINING COMPLETE")
    print("=" * 62)
    print("  Duration   : {:.1f} minutes ({:.2f} hours)".format(duration_min, duration_hrs))
    print("  Best weights : {}  [exists={}]".format(best_pt, best_pt.exists()))
    print("  Last weights : {}  [exists={}]".format(last_pt, last_pt.exists()))
    print()
    print("Next step -- run evaluation:")
    print("  python ml/vru/tools/evaluate.py --weights {}".format(best_pt))


if __name__ == "__main__":
    main()
