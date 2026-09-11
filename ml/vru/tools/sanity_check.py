"""
TransitEye VRU Safety AI -- Dataset Sanity Check Script
Checkpoint VRU-3

Draws YOLO bounding boxes back onto a random sample of images and saves
them for human visual inspection. Training must NOT start until this
check has been visually reviewed and confirmed.

Checks performed:
  - person boxes (green) align with pedestrians and riders
  - bicycle boxes (cyan) align with bicycles
  - motorcycle boxes (orange) align with motorcycles
  - No coordinate inversion
  - No systematic scaling error
  - Class labels are printed on each box

Usage:
    python ml/vru/tools/sanity_check.py --bdd100k-root <path-to-bdd100k>

    Optional:
    --n-train     Number of train images to sample (default: 20)
    --n-val       Number of val images to sample   (default: 10)
    --output-dir  Directory to save annotated images
                  (default: ml/vru/runs/sanity_check)
    --seed        Random seed for reproducibility  (default: 42)
    --require-vru Only sample images that have at least one VRU annotation
"""

import argparse
import random
import sys
from pathlib import Path

import cv2
import numpy as np


# Class display settings -- BGR colour order for OpenCV
CLASS_CONFIG = {
    0: {"name": "person",     "color": (0,   200,   0)},   # green
    1: {"name": "bicycle",    "color": (200, 200,   0)},   # cyan
    2: {"name": "motorcycle", "color": (0,   140, 255)},   # orange
}

IMG_W = 1280
IMG_H = 720


# ---- Image rendering ---------------------------------------------------------

def render_boxes(img_path, label_path):
    """
    Draw YOLO labels on an image.
    Returns annotated image (numpy array) or None if image cannot be loaded.
    """
    img = cv2.imread(str(img_path))
    if img is None:
        return None, 0

    h, w = img.shape[:2]
    box_count = 0

    # Overlay a semi-transparent black bar at the top for readability
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, 26), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.45, img, 0.55, 0, img)

    cv2.putText(
        img, img_path.name, (6, 17),
        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1, cv2.LINE_AA
    )

    # True negative -- empty or absent label file
    if not label_path.exists() or label_path.stat().st_size == 0:
        cv2.putText(
            img, "TRUE NEGATIVE (no VRU annotations)", (6, h - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (130, 130, 130), 1, cv2.LINE_AA
        )
        return img, 0

    with open(label_path, "r", encoding="utf-8") as fh:
        lines = [line.strip() for line in fh if line.strip()]

    for line in lines:
        parts = line.split()
        if len(parts) != 5:
            continue
        try:
            cls_id = int(parts[0])
            xc     = float(parts[1])
            yc     = float(parts[2])
            bw     = float(parts[3])
            bh     = float(parts[4])
        except ValueError:
            continue

        # De-normalise to pixel coordinates
        x1 = int((xc - bw / 2) * w)
        y1 = int((yc - bh / 2) * h)
        x2 = int((xc + bw / 2) * w)
        y2 = int((yc + bh / 2) * h)

        # Clamp to image bounds for display
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w - 1, x2), min(h - 1, y2)

        cfg   = CLASS_CONFIG.get(cls_id, {"name": "unknown", "color": (255, 255, 255)})
        color = cfg["color"]
        label = cfg["name"]

        # Draw bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        # Draw label background + text
        text_y = y1 - 5 if y1 > 20 else y2 + 15
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.52, 1)
        cv2.rectangle(img, (x1, text_y - th - 3), (x1 + tw + 4, text_y + 2), color, -1)
        cv2.putText(
            img, label, (x1 + 2, text_y),
            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 0, 0), 1, cv2.LINE_AA
        )
        box_count += 1

    cv2.putText(
        img, "{} VRU box(es)".format(box_count), (6, h - 10),
        cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1, cv2.LINE_AA
    )
    return img, box_count


# ---- Split sampling ----------------------------------------------------------

def sample_split(
    split_name,
    imgs_dir,
    labels_dir,
    n_sample,
    output_dir,
    seed,
    require_vru,
):
    """Sample images, render boxes, save, and return per-split stats."""
    print("\n[{}] Sampling {} images ...".format(split_name.upper(), n_sample))

    if not imgs_dir.exists():
        print("  [FATAL] Image directory not found: {}".format(imgs_dir))
        print("  Verify --bdd100k-root is correct.")
        sys.exit(1)

    if not labels_dir.exists():
        print("  [FATAL] Labels directory not found: {}".format(labels_dir))
        print("  Run ml/vru/tools/bdd100k_to_yolo.py first.")
        sys.exit(1)

    all_imgs = sorted(imgs_dir.glob("*.jpg"))
    if not all_imgs:
        print("  [FATAL] No .jpg images found in: {}".format(imgs_dir))
        sys.exit(1)

    rng = random.Random(seed)

    if require_vru:
        # Only sample images that have a non-empty label file
        candidates = [
            p for p in all_imgs
            if (labels_dir / "{}.txt".format(p.stem)).exists()
            and (labels_dir / "{}.txt".format(p.stem)).stat().st_size > 0
        ]
        if not candidates:
            print("  [WARN] No VRU-positive images found -- sampling all images instead.")
            candidates = all_imgs
    else:
        candidates = all_imgs

    sample = rng.sample(candidates, min(n_sample, len(candidates)))

    split_out = output_dir / split_name
    split_out.mkdir(parents=True, exist_ok=True)

    saved      = 0
    vru_images = 0
    neg_images = 0
    read_errors = 0

    for img_path in sample:
        label_path = labels_dir / "{}.txt".format(img_path.stem)
        annotated, box_count = render_boxes(img_path, label_path)

        if annotated is None:
            read_errors += 1
            print("  [WARN] Could not read image: {}".format(img_path.name))
            continue

        out_path = split_out / "sanity_{}_{}".format(split_name, img_path.name)
        cv2.imwrite(str(out_path), annotated)
        saved += 1

        if box_count > 0:
            vru_images += 1
        else:
            neg_images += 1

    print("  Saved {} annotated images -> {}".format(saved, split_out))
    print("  VRU-positive : {}  |  True negatives : {}  |  Read errors : {}".format(
        vru_images, neg_images, read_errors
    ))
    return saved, vru_images, neg_images


# ---- Entry point -------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=(
            "TransitEye VRU-3: Sanity-check YOLO labels by drawing boxes "
            "on sample images for human visual review."
        )
    )
    parser.add_argument(
        "--bdd100k-root", required=True,
        help="Path to the BDD100K root directory (same as used for conversion).",
    )
    parser.add_argument(
        "--n-train", type=int, default=20,
        help="Number of random train images to inspect (default: 20).",
    )
    parser.add_argument(
        "--n-val", type=int, default=10,
        help="Number of random val images to inspect (default: 10).",
    )
    parser.add_argument(
        "--output-dir", default="ml/vru/runs/sanity_check",
        help="Directory to save annotated images (default: ml/vru/runs/sanity_check).",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducible sample selection (default: 42).",
    )
    parser.add_argument(
        "--require-vru", action="store_true",
        help="Only sample images with at least one VRU annotation.",
    )
    args = parser.parse_args()

    bdd100k_root = Path(args.bdd100k_root).resolve()
    output_dir   = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 62)
    print("  TransitEye VRU-3: Dataset Sanity Check")
    print("=" * 62)
    print("  BDD100K root : {}".format(bdd100k_root))
    print("  Output dir   : {}".format(output_dir))
    print("  Seed         : {}".format(args.seed))
    print("  Require VRU  : {}".format(args.require_vru))

    splits = [
        (
            "train",
            bdd100k_root / "images" / "100k" / "train",
            bdd100k_root / "labels" / "100k" / "train",
            args.n_train,
        ),
        (
            "val",
            bdd100k_root / "images" / "100k" / "val",
            bdd100k_root / "labels" / "100k" / "val",
            args.n_val,
        ),
    ]

    total_saved = 0
    total_vru   = 0

    for split_name, imgs_dir, labels_dir, n_sample in splits:
        saved, vru_imgs, _ = sample_split(
            split_name, imgs_dir, labels_dir, n_sample,
            output_dir, args.seed, args.require_vru,
        )
        total_saved += saved
        total_vru   += vru_imgs

    sep = "=" * 62
    print("\n" + sep)
    print("  SANITY CHECK COMPLETE")
    print(sep)
    print("  Total images saved     : {}".format(total_saved))
    print("  Images with VRU labels : {}".format(total_vru))
    print("  Output directory       : {}".format(output_dir))
    print()
    print("  *** HUMAN REVIEW REQUIRED ***")
    print("  Open the saved images and verify ALL of the following:")
    print()
    print("  Colour key:")
    print("    GREEN  = person  (pedestrian or rider)")
    print("    CYAN   = bicycle")
    print("    ORANGE = motorcycle")
    print()
    print("  Checklist:")
    print("  [ ] person boxes (green) align with pedestrians / riders")
    print("  [ ] bicycle boxes (cyan) align with bicycles")
    print("  [ ] motorcycle boxes (orange) align with motorcycles")
    print("  [ ] No boxes are inverted or mirror-flipped")
    print("  [ ] No systematic vertical/horizontal offset")
    print("  [ ] No systematic scaling error (boxes not too large or small)")
    print("  [ ] Class label text on each box is correct")
    print()
    print("  DO NOT start training until visual inspection passes.")
    print("  If anything looks wrong, re-run bdd100k_to_yolo.py and investigate.")


if __name__ == "__main__":
    main()
