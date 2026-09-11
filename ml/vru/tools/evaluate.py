"""
TransitEye VRU Safety AI -- Post-Training Evaluation Script
Checkpoint VRU-3

Evaluates the fine-tuned YOLOv8n model on the held-out BDD100K val split
and writes all measured metrics to ml/vru/runs/vru3_baseline/metrics.md.

Rules:
  - Only MEASURED values are reported. No estimates or fabricated numbers.
  - Confidence scores are NOT compared to accuracy (different concepts).
  - Per-class performance is reported for person, bicycle, motorcycle.
  - Inference latency is measured on GPU.

Usage:
    python ml/vru/tools/evaluate.py

    Optional:
    --weights     Path to fine-tuned model weights
                  (default: ml/vru/runs/vru3_baseline/weights/best.pt)
    --data        Path to dataset YAML
                  (default: ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml)
    --imgsz       Inference image size (default: 640)
    --batch       Evaluation batch size (default: 8)
    --conf        Confidence threshold  (default: 0.25)
    --output-md   Output path for metrics.md
                  (default: ml/vru/runs/vru3_baseline/metrics.md)
"""

import argparse
import datetime
import sys
import time
from pathlib import Path


DEFAULT_WEIGHTS    = Path("ml/vru/runs/vru3_baseline/weights/best.pt")
DEFAULT_DATASET    = Path("ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml")
DEFAULT_OUTPUT_MD  = Path("ml/vru/runs/vru3_baseline/metrics.md")
CLASS_NAMES        = ["person", "bicycle", "motorcycle"]


# ---- Metrics markdown writer -------------------------------------------------

def write_metrics_md(
    output_path,
    weights_path,
    data_path,
    eval_args,
    mp, mr, map50, map5095,
    ap50_per_class, ap_per_class,
    speed,
    eval_duration_sec,
    gpu_name,
):
    """Write the full VRU-3 metrics report to a markdown file."""
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        "# VRU-3 Fine-Tuning Results — Evaluation Metrics",
        "",
        "> **Checkpoint**: VRU-3",
        "> **Model**: YOLOv8n fine-tuned on BDD100K VRU subset (person, bicycle, motorcycle)",
        "> **Evaluation split**: BDD100K val (10,000 images)",
        "> **GPU**: {}".format(gpu_name),
        "> **Evaluated**: {}".format(now),
        "",
        "---",
        "",
        "## Overall Metrics (MEASURED)",
        "",
        "| Metric | Value |",
        "|:---|:---|",
        "| Precision (mean)   | {:.4f} |".format(mp),
        "| Recall (mean)      | {:.4f} |".format(mr),
        "| mAP@0.50           | {:.4f} |".format(map50),
        "| mAP@0.50:0.95      | {:.4f} |".format(map5095),
        "",
        "---",
        "",
        "## Per-Class Metrics (MEASURED)",
        "",
        "| Class | mAP@0.50 | mAP@0.50:0.95 |",
        "|:---|:---|:---|",
    ]

    for i, cls_name in enumerate(CLASS_NAMES):
        ap50 = ap50_per_class[i] if i < len(ap50_per_class) else float("nan")
        ap   = ap_per_class[i]   if i < len(ap_per_class)   else float("nan")
        lines.append("| {} | {:.4f} | {:.4f} |".format(cls_name, ap50, ap))

    lines += [
        "",
        "---",
        "",
        "## Inference Latency (MEASURED)",
        "",
        "| Stage | Latency (ms per image) |",
        "|:---|:---|",
    ]

    if speed:
        lines += [
            "| Preprocess  | {:.2f} |".format(speed.get("preprocess",  float("nan"))),
            "| Inference   | {:.2f} |".format(speed.get("inference",   float("nan"))),
            "| Postprocess | {:.2f} |".format(speed.get("postprocess", float("nan"))),
        ]
    else:
        lines += [
            "| Preprocess  | UNKNOWN -- NOT MEASURED |",
            "| Inference   | UNKNOWN -- NOT MEASURED |",
            "| Postprocess | UNKNOWN -- NOT MEASURED |",
        ]

    lines += [
        "",
        "---",
        "",
        "## Evaluation Configuration",
        "",
        "| Parameter | Value |",
        "|:---|:---|",
        "| Weights | `{}` |".format(weights_path),
        "| Dataset YAML | `{}` |".format(data_path),
        "| Image size | {} |".format(eval_args.imgsz),
        "| Batch size | {} |".format(eval_args.batch),
        "| Confidence threshold | {} |".format(eval_args.conf),
        "| Device | GPU (cuda:0) -- {} |".format(gpu_name),
        "| Evaluation duration | {:.1f}s |".format(eval_duration_sec),
        "",
        "---",
        "",
        "## Important Notes",
        "",
        "- All metrics are MEASURED from `model.val()` on the BDD100K val split.",
        "- Confidence scores are **not** compared to accuracy. They are different concepts.",
        "- Domain-gap validation against custom bus-camera footage is reserved for a later checkpoint.",
        "- The BDD100K test split labels are withheld by Berkeley; the val split is our held-out set.",
        "- The `rider` class was merged into `person` during conversion (per dataset_selection.md §6.2).",
        "",
        "---",
        "",
        "## Failure Analysis",
        "",
        "> Fill this section after inspecting representative failure cases from the val split.",
        "> See ml/vru/runs/vru3_baseline/val_batch*_pred.jpg for visualised predictions.",
        "",
        "| Input / Scenario | Expected | Prediction | Failure Type | Likely Cause | Possible Improvement |",
        "|:---|:---|:---|:---|:---|:---|",
        "| *(inspect val visualisations)* | — | — | — | — | — |",
        "",
        "---",
        "",
        "## Domain-Gap Observations",
        "",
        "- BDD100K: forward-facing dashcam perspective (~1.0–1.3 m camera height)",
        "- TransitEye: bus windshield camera (~2.5–3.5 m camera height)",
        "- Domain gap severity: MODERATE (per dataset_selection.md §3.1)",
        "- Custom bus-camera domain validation: RESERVED for a future checkpoint",
        "",
        "---",
        "",
        "## Known Limitations",
        "",
        "- No spatial/proximity metric (bounding box only, no metric distance)",
        "- No temporal tracking across frames",
        "- Camera height mismatch (car dashcam vs. bus windshield)",
        "- USA geographic context may not generalise perfectly to local urban transit",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


# ---- Entry point -------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=(
            "TransitEye VRU-3: Evaluate fine-tuned YOLOv8n on the BDD100K val split."
        )
    )
    parser.add_argument(
        "--weights", default=str(DEFAULT_WEIGHTS),
        help="Path to fine-tuned weights (default: {}).".format(DEFAULT_WEIGHTS),
    )
    parser.add_argument(
        "--data", default=str(DEFAULT_DATASET),
        help="Path to dataset YAML (default: {}).".format(DEFAULT_DATASET),
    )
    parser.add_argument(
        "--imgsz", type=int, default=640,
        help="Inference image size (default: 640).",
    )
    parser.add_argument(
        "--batch", type=int, default=8,
        help="Evaluation batch size (default: 8).",
    )
    parser.add_argument(
        "--conf", type=float, default=0.25,
        help="Confidence threshold (default: 0.25).",
    )
    parser.add_argument(
        "--output-md", default=str(DEFAULT_OUTPUT_MD),
        help="Output path for metrics.md (default: {}).".format(DEFAULT_OUTPUT_MD),
    )
    args = parser.parse_args()

    weights_path  = Path(args.weights)
    data_path     = Path(args.data)
    output_md     = Path(args.output_md)

    print("=" * 62)
    print("  TransitEye VRU-3: Model Evaluation")
    print("=" * 62)
    print("  Weights  : {}".format(weights_path))
    print("  Dataset  : {}".format(data_path))
    print("  imgsz    : {}".format(args.imgsz))
    print("  batch    : {}".format(args.batch))
    print("  conf     : {}".format(args.conf))
    print("  Output   : {}".format(output_md))

    # Prerequisite checks
    import torch
    errors = []

    if not weights_path.exists():
        errors.append(
            "Weights not found: {}\n  Run ml/vru/tools/train.py first.".format(weights_path)
        )
    if not data_path.exists():
        errors.append("Dataset YAML not found: {}".format(data_path))

    if errors:
        print()
        for err in errors:
            for line in err.split("\n"):
                print("  [FATAL] {}".format(line))
        sys.exit(1)

    device = "0" if torch.cuda.is_available() else "cpu"
    if not torch.cuda.is_available():
        print("\n  [WARN] CUDA not available -- evaluation will run on CPU (slower).")

    gpu_name = (
        torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    )
    print("  Device   : {}".format(gpu_name))

    # Load model
    from ultralytics import YOLO
    print("\n[Loading] {} ...".format(weights_path))
    model = YOLO(str(weights_path))

    # Run validation
    print("[Evaluating] Running model.val() on BDD100K val split ...")
    t_start = time.time()
    metrics = model.val(
        data=str(data_path),
        imgsz=args.imgsz,
        batch=args.batch,
        conf=args.conf,
        device=device,
        verbose=True,
    )
    t_elapsed = time.time() - t_start

    # Extract metrics
    mp        = float(metrics.box.mp)
    mr        = float(metrics.box.mr)
    map50     = float(metrics.box.map50)
    map5095   = float(metrics.box.map)
    ap50_per_class = [float(v) for v in metrics.box.ap50]
    ap_per_class   = [float(v) for v in metrics.box.ap]
    speed     = metrics.speed  # dict: preprocess / inference / postprocess (ms)

    # Print summary
    print()
    print("=" * 62)
    print("  EVALUATION RESULTS (MEASURED)")
    print("=" * 62)
    print("  Precision (mean)  : {:.4f}".format(mp))
    print("  Recall    (mean)  : {:.4f}".format(mr))
    print("  mAP@0.50          : {:.4f}".format(map50))
    print("  mAP@0.50:0.95     : {:.4f}".format(map5095))
    if speed:
        print("  Latency           : preprocess={:.1f}ms | inference={:.1f}ms | postprocess={:.1f}ms".format(
            speed.get("preprocess", float("nan")),
            speed.get("inference",  float("nan")),
            speed.get("postprocess",float("nan")),
        ))
    print("  Eval duration     : {:.1f}s".format(t_elapsed))
    print()
    print("  Per-class performance:")
    for i, cls_name in enumerate(CLASS_NAMES):
        ap50 = ap50_per_class[i] if i < len(ap50_per_class) else float("nan")
        ap   = ap_per_class[i]   if i < len(ap_per_class)   else float("nan")
        print("    {:12s}: mAP50={:.4f}  mAP50-95={:.4f}".format(cls_name, ap50, ap))

    # Write metrics.md
    write_metrics_md(
        output_path=output_md,
        weights_path=weights_path,
        data_path=data_path,
        eval_args=args,
        mp=mp, mr=mr, map50=map50, map5095=map5095,
        ap50_per_class=ap50_per_class,
        ap_per_class=ap_per_class,
        speed=speed,
        eval_duration_sec=t_elapsed,
        gpu_name=gpu_name,
    )
    print()
    print("[Saved] Metrics written to: {}".format(output_md))
    print()
    print("VRU-3 evaluation complete. Review metrics.md before proceeding to VRU-4.")


if __name__ == "__main__":
    main()
