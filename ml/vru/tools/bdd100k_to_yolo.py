"""
TransitEye VRU Safety AI — BDD100K → YOLO Label Conversion Script
Checkpoint VRU-3

Converts BDD100K det_20 JSON annotations to YOLO bounding-box format,
applying the class mapping documented in dataset_selection.md §6.2.

Class mapping (source: dataset_selection.md — DO NOT change without VRU-2 review):
    BDD100K category    -> TransitEye YOLO class
    -------------------------------------------------
    pedestrian          -> 0  (person)
    rider               -> 0  (person, merged -- rider is a VRU)
    bicycle             -> 1  (bicycle)
    motor               -> 2  (motorcycle)
    car                 -> DISCARD
    truck               -> DISCARD
    bus                 -> DISCARD
    train               -> DISCARD
    traffic light       -> DISCARD
    traffic sign        -> DISCARD

Expected BDD100K directory structure:
    <bdd100k-root>/
    +-- images/
    |   +-- 100k/
    |       +-- train/          <- 70,000 .jpg images
    |       +-- val/            <- 10,000 .jpg images
    +-- labels/
        +-- det_20/
            +-- det_train.json  <- train annotations
            +-- det_val.json    <- val annotations

Output (written into the BDD100K root so Ultralytics auto-discovers them):
    <bdd100k-root>/
    +-- labels/
        +-- 100k/
            +-- train/          <- 70,000 .txt YOLO label files
            +-- val/            <- 10,000 .txt YOLO label files

Usage:
    python ml/vru/tools/bdd100k_to_yolo.py --bdd100k-root <path-to-bdd100k>

    Optional:
    --output-yaml  Path for the generated bdd100k_vru.yaml
                   (default: ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml)
    --dry-run      Parse and validate without writing any label files
"""

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path


# ---- Class mapping (source: dataset_selection.md section 6.2) ---------------
BDD100K_TO_YOLO = {
    "pedestrian": 0,   # person
    "rider":      0,   # person -- merged per VRU-2 decision
    "bicycle":    1,   # bicycle
    "motor":      2,   # motorcycle
}
YOLO_CLASS_NAMES = {0: "person", 1: "bicycle", 2: "motorcycle"}

DISCARD_CLASSES = {
    "car", "truck", "bus", "train", "traffic light", "traffic sign"
}

# BDD100K canonical image dimensions (VERIFIED -- dataset_selection.md)
IMG_W = 1280
IMG_H = 720

# Conversion halts if malformed annotation rate exceeds this fraction of VRU total
MALFORMED_STOP_THRESHOLD = 0.01   # 1 %

# Warn / halt thresholds for images missing from disk
MISSING_IMAGE_WARN_THRESHOLD = 0.05    # 5 %
MISSING_IMAGE_HALT_THRESHOLD = 0.20   # 20 %


# ---- Per-split conversion ----------------------------------------------------

def convert_split(json_path, images_dir, labels_out_dir, split_name, dry_run=False):
    """
    Convert one BDD100K split from JSON to YOLO label files.
    Returns a stats dict. Calls sys.exit(1) on unrecoverable errors.
    """
    sep = "=" * 62
    print("\n" + sep)
    print("  Converting split: {}".format(split_name.upper()))
    print("  Annotation file : {}".format(json_path))
    print("  Images directory: {}".format(images_dir))
    print("  Labels output   : {}".format(labels_out_dir))
    if dry_run:
        print("  DRY-RUN -- no files will be written")
    print(sep)

    # Step 1: Load annotation JSON
    print("\n[1/4] Loading annotation JSON ...")
    if not json_path.exists():
        _fatal(
            "Annotation file not found: {}".format(json_path),
            "Expected BDD100K det_20 annotation file.",
            "Download 'bdd100k_det_20_labels_trainval.zip' from bdd-data.berkeley.edu",
            "and extract so that the file exists at the path above.",
        )

    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, list):
        _fatal(
            "Unexpected root type in {}: expected JSON list, got {}".format(
                json_path.name, type(data).__name__
            ),
            "BDD100K det_20 format: list of {name: str, labels: [...]}",
            "This does not match. Verify you downloaded the correct annotation file.",
        )

    if len(data) == 0:
        _fatal("Annotation file is empty: {}".format(json_path))

    print("  Loaded {:,} image annotation entries.".format(len(data)))

    # Step 2: Verify annotation format on a sample
    print("\n[2/4] Verifying annotation format ...")
    _verify_format(data, json_path)
    print("  Format verification PASSED.")

    # Step 3: Scan all categories
    print("\n[3/4] Scanning categories ...")
    raw_category_counts = defaultdict(int)
    for entry in data:
        for lbl in (entry.get("labels") or []):
            raw_category_counts[lbl.get("category", "__missing__")] += 1

    print("  Raw annotation counts per BDD100K category:")
    for cat, cnt in sorted(raw_category_counts.items(), key=lambda x: -x[1]):
        if cat in BDD100K_TO_YOLO:
            cls_id = BDD100K_TO_YOLO[cat]
            tag = "-> class {} ({})".format(cls_id, YOLO_CLASS_NAMES[cls_id])
        elif cat in DISCARD_CLASSES:
            tag = "-> DISCARD"
        else:
            tag = "-> WARNING: UNEXPECTED -- will be discarded"
        print("    {:22s}: {:>9,}  {}".format(cat, cnt, tag))

    unexpected = [
        c for c in raw_category_counts
        if c not in BDD100K_TO_YOLO and c not in DISCARD_CLASSES
    ]
    if unexpected:
        print("\n  [WARN] Unexpected categories not in mapping: {}".format(unexpected))
        print("  These will be discarded. Verify this matches your expectations.")

    # Step 4: Convert
    print("\n[4/4] Converting to YOLO format ...")
    if not dry_run:
        labels_out_dir.mkdir(parents=True, exist_ok=True)

    stats = {
        "split": split_name,
        "annotation_entries": len(data),
        "images_with_vru": 0,
        "images_without_vru": 0,
        "images_missing_from_disk": 0,
        "label_files_written": 0,
        "annotations": {
            "person":     0,
            "bicycle":    0,
            "motorcycle": 0,
            "discarded":  0,
            "malformed":  0,
        },
        "malformed_reasons": defaultdict(int),
    }

    for entry in data:
        img_name = entry.get("name", "")
        if not img_name:
            stats["annotations"]["malformed"] += 1
            stats["malformed_reasons"]["entry missing 'name' field"] += 1
            continue

        label_stem = Path(img_name).stem
        label_path = labels_out_dir / "{}.txt".format(label_stem)
        img_path   = images_dir / img_name

        if not img_path.exists():
            stats["images_missing_from_disk"] += 1

        raw_labels = entry.get("labels") or []
        yolo_lines = []

        for lbl in raw_labels:
            category = lbl.get("category", "")
            box2d    = lbl.get("box2d") or {}

            # Class filtering
            if category in DISCARD_CLASSES or category not in BDD100K_TO_YOLO:
                stats["annotations"]["discarded"] += 1
                continue

            # Coordinate extraction
            try:
                x1 = float(box2d["x1"])
                y1 = float(box2d["y1"])
                x2 = float(box2d["x2"])
                y2 = float(box2d["y2"])
            except (KeyError, TypeError, ValueError) as exc:
                stats["annotations"]["malformed"] += 1
                stats["malformed_reasons"][
                    "coord parse error ({})".format(type(exc).__name__)
                ] += 1
                continue

            # Degenerate box rejection (before clamping)
            if x2 <= x1:
                stats["annotations"]["malformed"] += 1
                stats["malformed_reasons"]["x2 <= x1 (zero or negative width)"] += 1
                continue
            if y2 <= y1:
                stats["annotations"]["malformed"] += 1
                stats["malformed_reasons"]["y2 <= y1 (zero or negative height)"] += 1
                continue

            # Clamp to image bounds (minor overflows are normal in BDD100K)
            x1 = max(0.0, min(x1, float(IMG_W)))
            y1 = max(0.0, min(y1, float(IMG_H)))
            x2 = max(0.0, min(x2, float(IMG_W)))
            y2 = max(0.0, min(y2, float(IMG_H)))

            # Re-check after clamping
            if x2 <= x1 or y2 <= y1:
                stats["annotations"]["malformed"] += 1
                stats["malformed_reasons"]["degenerate box after coordinate clamping"] += 1
                continue

            # YOLO normalization (source: dataset_selection.md section 6.3)
            x_center = (x1 + x2) / (2.0 * IMG_W)
            y_center = (y1 + y2) / (2.0 * IMG_H)
            width    = (x2 - x1) / IMG_W
            height   = (y2 - y1) / IMG_H

            # Final range validation
            out_of_range = False
            for val, name in [
                (x_center, "x_center"),
                (y_center, "y_center"),
                (width,    "width"),
                (height,   "height"),
            ]:
                if not (0.0 <= val <= 1.0):
                    stats["annotations"]["malformed"] += 1
                    stats["malformed_reasons"][
                        "{}={:.4f} out of [0,1] after normalization".format(name, val)
                    ] += 1
                    out_of_range = True
                    break
            if out_of_range:
                continue

            # Accepted -- emit YOLO line
            class_id   = BDD100K_TO_YOLO[category]
            class_name = YOLO_CLASS_NAMES[class_id]
            yolo_lines.append(
                "{} {:.6f} {:.6f} {:.6f} {:.6f}".format(
                    class_id, x_center, y_center, width, height
                )
            )
            stats["annotations"][class_name] += 1

        # Write label file (empty file = true negative, retained per VRU-2 plan)
        if not dry_run:
            with open(label_path, "w", encoding="utf-8") as fh:
                fh.write("\n".join(yolo_lines))
            stats["label_files_written"] += 1

        if yolo_lines:
            stats["images_with_vru"] += 1
        else:
            stats["images_without_vru"] += 1

    print("  Done. Processed {:,} entries.".format(stats["annotation_entries"]))
    return stats


# ---- Report and validation ---------------------------------------------------

def print_report(train_stats, val_stats):
    sep = "=" * 62
    print("\n" + sep)
    print("  CONVERSION REPORT")
    print(sep)

    for s in (train_stats, val_stats):
        split    = s["split"].upper()
        vru_total = (
            s["annotations"]["person"]
            + s["annotations"]["bicycle"]
            + s["annotations"]["motorcycle"]
        )
        print("\n  [{}]".format(split))
        print("  Annotation entries        : {:>9,}".format(s["annotation_entries"]))
        print("  Images with VRU labels    : {:>9,}".format(s["images_with_vru"]))
        print("  Images without VRU labels : {:>9,}  <- retained as true negatives".format(
            s["images_without_vru"]
        ))
        print("  Images missing from disk  : {:>9,}".format(s["images_missing_from_disk"]))
        print("  Label files written       : {:>9,}".format(s["label_files_written"]))
        print()
        print("  VRU annotation counts:")
        print("    person     (class 0)    : {:>9,}".format(s["annotations"]["person"]))
        print("    bicycle    (class 1)    : {:>9,}".format(s["annotations"]["bicycle"]))
        print("    motorcycle (class 2)    : {:>9,}".format(s["annotations"]["motorcycle"]))
        print("    " + "-" * 42)
        print("    Total VRU annotations   : {:>9,}".format(vru_total))
        print()
        print("  Non-VRU annotations discarded : {:>9,}".format(s["annotations"]["discarded"]))
        print("  Malformed annotations rejected: {:>9,}".format(s["annotations"]["malformed"]))
        if s["malformed_reasons"]:
            for reason, cnt in sorted(s["malformed_reasons"].items(), key=lambda x: -x[1]):
                print("      - {}: {:,}".format(reason, cnt))

    # Validation checks
    print("\n" + sep)
    print("  VALIDATION CHECKS")
    print(sep)

    errors = []

    for s in (train_stats, val_stats):
        split    = s["split"].upper()
        vru_total = (
            s["annotations"]["person"]
            + s["annotations"]["bicycle"]
            + s["annotations"]["motorcycle"]
            + s["annotations"]["malformed"]
        )

        # Malformed rate
        if vru_total > 0:
            malformed_rate = s["annotations"]["malformed"] / vru_total
            if malformed_rate > MALFORMED_STOP_THRESHOLD:
                errors.append(
                    "[{}] Malformed annotation rate {:.2%} exceeds threshold {:.0%}. "
                    "Verify annotation file integrity.".format(
                        split, malformed_rate, MALFORMED_STOP_THRESHOLD
                    )
                )

        # Per-class zero check
        for cls_name in ("person", "bicycle", "motorcycle"):
            if s["annotations"][cls_name] == 0:
                errors.append(
                    "[{}] Zero annotations for class '{}'. "
                    "Data integrity check FAILED -- check class mapping.".format(split, cls_name)
                )

        # Missing images
        if s["annotation_entries"] > 0:
            missing_rate = s["images_missing_from_disk"] / s["annotation_entries"]
            if missing_rate > MISSING_IMAGE_HALT_THRESHOLD:
                errors.append(
                    "[{}] {:,} images ({:.1%}) not found on disk. "
                    "Verify --bdd100k-root is correct.".format(
                        split, s["images_missing_from_disk"], missing_rate
                    )
                )
            elif missing_rate > MISSING_IMAGE_WARN_THRESHOLD:
                print(
                    "  [WARN] [{}] {:,} images ({:.1%}) not found on disk -- "
                    "above warn threshold but below halt threshold. "
                    "Verify dataset is fully extracted.".format(
                        split, s["images_missing_from_disk"], missing_rate
                    )
                )

    if errors:
        print()
        for err in errors:
            print("  [FATAL] {}".format(err))
        print()
        print("  Conversion FAILED. Resolve the errors above before proceeding.")
        sys.exit(1)

    print()
    print("  [OK] Malformed annotation rate within threshold")
    print("  [OK] All three VRU classes present in both splits")
    print("  [OK] Missing image count within acceptable range")
    print()
    print("  All validation checks PASSED.")
    print("  Dataset is ready for sanity check and training.")


# ---- Dataset YAML generation -------------------------------------------------

def write_dataset_yaml(bdd100k_root, output_yaml):
    """
    Write bdd100k_vru.yaml with the absolute BDD100K root path.

    Ultralytics label discovery rule:
      images at : <path>/images/100k/<split>/
      labels at : <path>/labels/100k/<split>/   <- auto-resolved by replacing
                                                    'images' with 'labels'
    """
    root_str = str(bdd100k_root).replace("\\", "/")

    yaml_content = (
        "# TransitEye VRU-3 dataset configuration\n"
        "# Source: BDD100K (Yu et al., CVPR 2020) -- det_20 detection labels\n"
        "#\n"
        "# Class mapping (per dataset_selection.md section 6.2):\n"
        "#   BDD100K pedestrian  -> class 0 (person)\n"
        "#   BDD100K rider       -> class 0 (person, merged)\n"
        "#   BDD100K bicycle     -> class 1 (bicycle)\n"
        "#   BDD100K motor       -> class 2 (motorcycle)\n"
        "#   All other classes   -> DISCARDED\n"
        "#\n"
        "# DO NOT edit this file manually.\n"
        "# Re-run ml/vru/tools/bdd100k_to_yolo.py to regenerate.\n"
        "#\n"
        "# Ultralytics label discovery:\n"
        "#   images: <path>/images/100k/<split>/\n"
        "#   labels: <path>/labels/100k/<split>/  (auto-resolved)\n"
        "\n"
        "path: {}\n".format(root_str) +
        "train: images/100k/train\n"
        "val:   images/100k/val\n"
        "\n"
        "nc: 3\n"
        "names:\n"
        "  0: person\n"
        "  1: bicycle\n"
        "  2: motorcycle\n"
    )

    output_yaml.parent.mkdir(parents=True, exist_ok=True)
    with open(output_yaml, "w", encoding="utf-8") as fh:
        fh.write(yaml_content)
    print("\n[YAML] Dataset config written: {}".format(output_yaml))


# ---- Helpers -----------------------------------------------------------------

def _verify_format(data, json_path):
    """Verify BDD100K det_20 annotation format on the first entry with labels."""
    sample = None
    for entry in data:
        if entry.get("labels"):
            sample = entry
            break

    if sample is None:
        print("  [WARN] No entries with labels found -- cannot verify label format.")
        return

    if "name" not in sample:
        _fatal(
            "Annotation entry missing required 'name' field.",
            "Got keys: {}".format(sorted(sample.keys())),
            "File: {}".format(json_path),
        )

    lbl = sample["labels"][0]

    for required in ("category", "box2d"):
        if required not in lbl:
            _fatal(
                "Label entry missing required field '{}'.".format(required),
                "Got keys: {}".format(sorted(lbl.keys())),
                "Expected BDD100K det_20 format: {category, box2d: {x1,y1,x2,y2}}",
            )

    box = lbl["box2d"]
    for coord in ("x1", "y1", "x2", "y2"):
        if coord not in box:
            _fatal(
                "box2d entry missing coordinate '{}'.".format(coord),
                "Got box2d keys: {}".format(sorted(box.keys())),
                "Expected: {x1, y1, x2, y2}",
            )

    print("  Sample image    : {}".format(sample["name"]))
    print("  Sample category : {}".format(lbl["category"]))
    print("  Sample box2d    : {}".format(box))


def _fatal(*lines):
    print()
    for line in lines:
        print("  [FATAL] {}".format(line))
    print()
    sys.exit(1)


# ---- Entry point -------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=(
            "TransitEye VRU-3: Convert BDD100K det_20 annotations to YOLO format.\n\n"
            "Expected BDD100K structure:\n"
            "  <bdd100k-root>/images/100k/train/*.jpg\n"
            "  <bdd100k-root>/images/100k/val/*.jpg\n"
            "  <bdd100k-root>/labels/det_20/det_train.json\n"
            "  <bdd100k-root>/labels/det_20/det_val.json\n\n"
            "Output:\n"
            "  <bdd100k-root>/labels/100k/train/*.txt\n"
            "  <bdd100k-root>/labels/100k/val/*.txt"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--bdd100k-root",
        required=True,
        help="Path to the BDD100K dataset root directory.",
    )
    parser.add_argument(
        "--output-yaml",
        default="ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml",
        help=(
            "Output path for the YOLO dataset YAML. "
            "Default: ml/vru/datasets/bdd100k_vru/bdd100k_vru.yaml"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate annotations without writing any label files.",
    )
    args = parser.parse_args()

    bdd100k_root = Path(args.bdd100k_root).resolve()
    output_yaml  = Path(args.output_yaml)

    print("=" * 62)
    print("  TransitEye VRU-3: BDD100K -> YOLO Conversion")
    print("=" * 62)
    print("  BDD100K root : {}".format(bdd100k_root))
    print("  Output YAML  : {}".format(output_yaml))
    print("  Dry-run      : {}".format(args.dry_run))

    if not bdd100k_root.exists():
        _fatal(
            "BDD100K root directory not found: {}".format(bdd100k_root),
            "Download BDD100K from bdd-data.berkeley.edu and extract it,",
            "then re-run with the correct --bdd100k-root path.",
        )

    train_json   = bdd100k_root / "labels" / "det_20" / "det_train.json"
    val_json     = bdd100k_root / "labels" / "det_20" / "det_val.json"
    train_imgs   = bdd100k_root / "images"  / "100k"  / "train"
    val_imgs     = bdd100k_root / "images"  / "100k"  / "val"
    train_labels = bdd100k_root / "labels"  / "100k"  / "train"
    val_labels   = bdd100k_root / "labels"  / "100k"  / "val"

    for d in (train_imgs, val_imgs):
        if not d.exists():
            _fatal(
                "Image directory not found: {}".format(d),
                "Verify the BDD100K images archive has been fully extracted.",
            )

    train_stats = convert_split(train_json, train_imgs, train_labels, "train", args.dry_run)
    val_stats   = convert_split(val_json,   val_imgs,   val_labels,   "val",   args.dry_run)

    print_report(train_stats, val_stats)

    if not args.dry_run:
        write_dataset_yaml(bdd100k_root, output_yaml)

    print()
    print("Conversion complete.")
    print()
    print("Next step -- run the sanity check:")
    print("  python ml/vru/tools/sanity_check.py --bdd100k-root {}".format(bdd100k_root))


if __name__ == "__main__":
    main()
