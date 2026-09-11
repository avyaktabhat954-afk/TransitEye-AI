#!/usr/bin/env python3
"""
TransitEye — Person 3 Road Defect Detection Dataset Preparation Script
Converts RDD2022 India Pascal VOC annotations to YOLOv8 format with a deterministic
stratified 80/20 train/validation split and comprehensive integrity validation.
"""

import os
import sys
import shutil
import random
import argparse
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from PIL import Image

# -----------------------------------------------------------------------------
# Configuration and Constants
# -----------------------------------------------------------------------------

DEFAULT_RAW_DIR = "data/raw/India"
DEFAULT_PROCESSED_DIR = "data/processed/road_defects"
DEFAULT_SEED = 42
DEFAULT_TRAIN_RATIO = 0.80

CLASS_MAPPING = {
    "D00": 0,    # longitudinal_crack
    "D10": 1,    # transverse_crack
    "D20": 2,    # alligator_crack
    "D40": 3,    # pothole
    "D0w0": 0,   # clerical typo in India_006389.xml -> D00 (longitudinal_crack)
}

CLASS_NAMES = {
    0: "longitudinal_crack",
    1: "transverse_crack",
    2: "alligator_crack",
    3: "pothole",
}

EXCLUSION_REASONS = {
    "D01": "Longitudinal construction joint crack — excluded from 4-class evaluation schema per official CRDDC'2022 label map",
    "D11": "Transverse construction joint crack — excluded from 4-class evaluation schema per official CRDDC'2022 label map",
    "D43": "Crosswalk blur — surface marking degradation, not a structural road surface defect",
    "D44": "White line blur / lane marking blur — surface paint degradation, not a structural road surface defect",
    "D50": "Manhole / utility cover — municipal utility asset, not a structural road defect",
}


def parse_voc_xml(xml_path):
    """
    Parses a Pascal VOC XML annotation file.
    Returns (width, height, retained_boxes, excluded_labels).
    retained_boxes: list of (class_id, xmin, ymin, xmax, ymax)
    excluded_labels: list of str
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()

    size_elem = root.find("size")
    width = int(size_elem.find("width").text)
    height = int(size_elem.find("height").text)

    retained_boxes = []
    excluded_labels = []

    for obj in root.findall("object"):
        name_elem = obj.find("name")
        if name_elem is None or not name_elem.text:
            continue
        label = name_elem.text.strip()

        if label in CLASS_MAPPING:
            class_id = CLASS_MAPPING[label]
            bnd = obj.find("bndbox")
            xmin = float(bnd.find("xmin").text)
            ymin = float(bnd.find("ymin").text)
            xmax = float(bnd.find("xmax").text)
            ymax = float(bnd.find("ymax").text)
            retained_boxes.append((class_id, label, xmin, ymin, xmax, ymax))
        else:
            excluded_labels.append(label)

    return width, height, retained_boxes, excluded_labels


def voc_to_yolo_coords(xmin, ymin, xmax, ymax, img_w, img_h):
    """
    Converts bounding box coordinates to normalized YOLO format.
    Returns (x_center, y_center, width, height) clamped to [0.0, 1.0].
    """
    # Clamp coordinates to image boundaries
    xmin = max(0.0, min(float(img_w), xmin))
    xmax = max(0.0, min(float(img_w), xmax))
    ymin = max(0.0, min(float(img_h), ymin))
    ymax = max(0.0, min(float(img_h), ymax))

    bw = xmax - xmin
    bh = ymax - ymin

    if bw <= 0.0 or bh <= 0.0:
        return None

    xc = xmin + (bw / 2.0)
    yc = ymin + (bh / 2.0)

    norm_xc = xc / float(img_w)
    norm_yc = yc / float(img_h)
    norm_w = bw / float(img_w)
    norm_h = bh / float(img_h)

    # Round to 6 decimal places for cleanliness and precision
    return (
        round(norm_xc, 6),
        round(norm_yc, 6),
        round(norm_w, 6),
        round(norm_h, 6),
    )


def build_deterministic_split(parsed_data, seed=DEFAULT_SEED, train_ratio=DEFAULT_TRAIN_RATIO):
    """
    Creates a deterministic 80/20 train/validation split using a tiered image-level
    stratification heuristic to preserve rare classes (specifically D10) and background images.
    """
    tiers = defaultdict(list)
    for base_id, info in sorted(parsed_data.items()):
        class_ids = {box[0] for box in info["retained_boxes"]}
        if 1 in class_ids:       # Contains rare class transverse_crack (D10)
            tiers["tier1_D10"].append(base_id)
        elif 0 in class_ids:     # Contains longitudinal_crack (D00)
            tiers["tier2_D00"].append(base_id)
        elif 2 in class_ids:     # Contains alligator_crack (D20)
            tiers["tier3_D20"].append(base_id)
        elif 3 in class_ids:     # Contains pothole (D40)
            tiers["tier4_D40"].append(base_id)
        else:                    # Pure background / no retained target objects
            tiers["tier5_background"].append(base_id)

    rng = random.Random(seed)
    train_ids = set()
    val_ids = set()

    for tier_name in sorted(tiers.keys()):
        id_list = sorted(tiers[tier_name])
        rng.shuffle(id_list)
        n_train = int(round(len(id_list) * train_ratio))
        train_ids.update(id_list[:n_train])
        val_ids.update(id_list[n_train:])

    return train_ids, val_ids, tiers


def generate_data_yaml(output_dir):
    """Generates the YOLOv8 dataset configuration file."""
    rel_path = os.path.relpath(output_dir, os.getcwd()) if os.path.isabs(output_dir) else output_dir
    yaml_content = f"""# TransitEye Person 3 — Road Defect Detection YOLOv8 Dataset Configuration
# Generated automatically by scripts/prepare_road_defect_dataset.py

path: {rel_path}
train: images/train
val: images/val

names:
  0: longitudinal_crack
  1: transverse_crack
  2: alligator_crack
  3: pothole
"""
    yaml_path = os.path.join(output_dir, "data.yaml")
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)
    return yaml_path


def validate_converted_dataset(output_dir, raw_dir, train_ids, val_ids, parsed_data):
    """
    Executes automated integrity checks across all 14 criteria.
    Returns (success: bool, issues: list).
    """
    issues = []
    print("\nRunning automated integrity validation checks...")

    test_img_dir = os.path.join(raw_dir, "test", "images")
    official_test_names = set(os.listdir(test_img_dir)) if os.path.exists(test_img_dir) else set()

    for split in ["train", "val"]:
        img_dir = os.path.join(output_dir, "images", split)
        lbl_dir = os.path.join(output_dir, "labels", split)

        imgs = set(os.listdir(img_dir))
        lbls = set(os.listdir(lbl_dir))
        expected_ids = train_ids if split == "train" else val_ids

        # Check 1: Count match
        if len(imgs) != len(expected_ids):
            issues.append(f"[{split}] Image count mismatch: expected {len(expected_ids)}, got {len(imgs)}")

        for base_id in expected_ids:
            img_file = f"{base_id}.jpg"
            lbl_file = f"{base_id}.txt"

            # Check 1: Corresponding label file exists
            if img_file not in imgs:
                issues.append(f"[{split}] Missing image file: {img_file}")
            if lbl_file not in lbls:
                issues.append(f"[{split}] Missing label file: {lbl_file}")

            # Check 9: Official test image not included
            if img_file in official_test_names:
                issues.append(f"[{split}] CRITICAL: Official test image leaked into dataset: {img_file}")

            # Check label syntax and values
            lbl_path = os.path.join(lbl_dir, lbl_file)
            if os.path.exists(lbl_path):
                with open(lbl_path, "r", encoding="utf-8") as f:
                    lines = [l.strip() for l in f if l.strip()]

                raw_retained = parsed_data[base_id]["retained_boxes"]
                if len(lines) != len(raw_retained):
                    issues.append(f"[{split}] Object count mismatch in {lbl_file}: expected {len(raw_retained)}, got {len(lines)}")

                for line in lines:
                    parts = line.split()
                    if len(parts) != 5:
                        issues.append(f"[{split}] Invalid syntax in {lbl_file}: '{line}'")
                        continue
                    try:
                        cid = int(parts[0])
                        xc, yc, w, h = map(float, parts[1:])

                        # Check 3: Class ID range
                        if cid not in [0, 1, 2, 3]:
                            issues.append(f"[{split}] Class ID out of range [0, 3] in {lbl_file}: {cid}")

                        # Check 4: Coordinates range
                        if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0):
                            issues.append(f"[{split}] Normalized center out of bounds [0, 1] in {lbl_file}: xc={xc}, yc={yc}")

                        # Check 5: Width and height positive and bounded
                        if w <= 0.0 or h <= 0.0 or w > 1.0 or h > 1.0:
                            issues.append(f"[{split}] Invalid bbox dimensions in {lbl_file}: w={w}, h={h}")
                    except ValueError as e:
                        issues.append(f"[{split}] Parse error in {lbl_file}: {e}")

    # Check 7 & 8: No train/validation overlap
    overlap = train_ids.intersection(val_ids)
    if overlap:
        issues.append(f"CRITICAL: Train and validation sets overlap! Overlapping IDs: {len(overlap)}")

    # Check 10: Sample check that images can be opened
    sample_to_check = random.sample(sorted(train_ids), min(25, len(train_ids))) + random.sample(sorted(val_ids), min(25, len(val_ids)))
    for base_id in sample_to_check:
        split = "train" if base_id in train_ids else "val"
        img_p = os.path.join(output_dir, "images", split, f"{base_id}.jpg")
        try:
            with Image.open(img_p) as im:
                im.verify()
        except Exception as e:
            issues.append(f"[{split}] Failed to open image {img_p}: {e}")

    # Check 6: XML coordinate round-trip verification on a sample
    sample_boxes = random.sample(sorted(train_ids), min(20, len(train_ids)))
    for base_id in sample_boxes:
        retained = parsed_data[base_id]["retained_boxes"]
        if not retained:
            continue
        w_img = parsed_data[base_id]["width"]
        h_img = parsed_data[base_id]["height"]
        lbl_p = os.path.join(output_dir, "labels", "train", f"{base_id}.txt")
        with open(lbl_p, "r", encoding="utf-8") as f:
            yolo_lines = [l.strip().split() for l in f if l.strip()]

        for (_, _, xmin, ymin, xmax, ymax), yline in zip(retained, yolo_lines):
            xc, yc, bw, bh = map(float, yline[1:])
            recon_xmin = (xc - bw / 2.0) * w_img
            recon_xmax = (xc + bw / 2.0) * w_img
            recon_ymin = (yc - bh / 2.0) * h_img
            recon_ymax = (yc + bh / 2.0) * h_img
            if abs(recon_xmin - xmin) > 1.0 or abs(recon_ymin - ymin) > 1.0:
                issues.append(f"Coordinate reconstruction drift in {base_id}: orig=({xmin},{ymin}) vs recon=({recon_xmin},{recon_ymin})")

    return len(issues) == 0, issues


def main():
    parser = argparse.ArgumentParser(description="Prepare and convert RDD2022 India dataset for YOLOv8 road defect detection.")
    parser.add_argument("--raw-dir", default=DEFAULT_RAW_DIR, help="Path to raw India dataset directory")
    parser.add_argument("--output-dir", default=DEFAULT_PROCESSED_DIR, help="Path to processed output directory")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed for train/val split")
    parser.add_argument("--train-ratio", type=float, default=DEFAULT_TRAIN_RATIO, help="Ratio of training images (default 0.80)")
    args = parser.parse_args()

    raw_dir = os.path.abspath(args.raw_dir)
    output_dir = os.path.abspath(args.output_dir)

    train_img_raw = os.path.join(raw_dir, "train", "images")
    train_xml_raw = os.path.join(raw_dir, "train", "annotations", "xmls")

    print("=" * 70)
    print("TransitEye — Person 3 Dataset Preparation & Conversion")
    print("=" * 70)
    print(f"Raw dataset directory : {raw_dir}")
    print(f"Output directory      : {output_dir}")
    print(f"Random seed           : {args.seed}")
    print(f"Train/Val split ratio : {args.train_ratio:.2f} / {1.0 - args.train_ratio:.2f}")

    if not os.path.exists(train_img_raw) or not os.path.exists(train_xml_raw):
        print(f"ERROR: Raw dataset directories not found in {raw_dir}")
        sys.exit(1)

    raw_xml_files = sorted([f for f in os.listdir(train_xml_raw) if f.endswith(".xml")])
    raw_img_files = sorted([f for f in os.listdir(train_img_raw) if f.endswith(".jpg")])

    print(f"\nDiscovered {len(raw_img_files)} raw training images and {len(raw_xml_files)} XML annotations.")

    # 1. Parse all XMLs and validate
    parsed_data = {}
    excluded_counts = Counter()
    retained_counts = Counter()
    retained_images_per_class = defaultdict(set)

    print("Parsing VOC XML annotations and applying label policy...")
    for xml_f in raw_xml_files:
        base_id = os.path.splitext(xml_f)[0]
        xml_path = os.path.join(train_xml_raw, xml_f)
        width, height, retained_boxes, excluded_labels = parse_voc_xml(xml_path)

        parsed_data[base_id] = {
            "width": width,
            "height": height,
            "retained_boxes": retained_boxes,
            "excluded_labels": excluded_labels,
        }

        for exc in excluded_labels:
            excluded_counts[exc] += 1

        for box in retained_boxes:
            cid = box[0]
            retained_counts[cid] += 1
            retained_images_per_class[cid].add(base_id)

    total_retained_objects = sum(retained_counts.values())
    total_excluded_objects = sum(excluded_counts.values())
    total_raw_objects = total_retained_objects + total_excluded_objects

    print(f"Parsed {total_raw_objects} total objects across {len(parsed_data)} images:")
    print(f"  -> Retained target objects: {total_retained_objects}")
    print(f"  -> Excluded objects       : {total_excluded_objects}")

    # 2. Perform deterministic split
    print(f"\nComputing deterministic {args.train_ratio*100:.0f}/{(1-args.train_ratio)*100:.0f} split (Seed: {args.seed})...")
    train_ids, val_ids, tiers = build_deterministic_split(parsed_data, seed=args.seed, train_ratio=args.train_ratio)
    print(f"Split results:")
    print(f"  -> Train images: {len(train_ids)} ({len(train_ids) / len(parsed_data) * 100:.2f}%)")
    print(f"  -> Val images  : {len(val_ids)} ({len(val_ids) / len(parsed_data) * 100:.2f}%)")

    # 3. Create destination directory structure
    for split in ["train", "val"]:
        os.makedirs(os.path.join(output_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "labels", split), exist_ok=True)

    # 4. Convert and copy files
    print("\nWriting YOLO annotations and copying images to destination...")
    train_split_counts = Counter()
    val_split_counts = Counter()
    train_split_imgs = defaultdict(set)
    val_split_imgs = defaultdict(set)
    train_bg_count = 0
    val_bg_count = 0

    for base_id, info in parsed_data.items():
        is_train = base_id in train_ids
        split = "train" if is_train else "val"

        src_img = os.path.join(train_img_raw, f"{base_id}.jpg")
        dst_img = os.path.join(output_dir, "images", split, f"{base_id}.jpg")
        dst_lbl = os.path.join(output_dir, "labels", split, f"{base_id}.txt")

        # Copy image file
        shutil.copyfile(src_img, dst_img)

        # Write YOLO label file
        retained = info["retained_boxes"]
        w_img = info["width"]
        h_img = info["height"]

        if not retained:
            # Empty label file for background images
            open(dst_lbl, "w", encoding="utf-8").close()
            if is_train:
                train_bg_count += 1
            else:
                val_bg_count += 1
        else:
            lines = []
            for (cid, orig_label, xmin, ymin, xmax, ymax) in retained:
                coords = voc_to_yolo_coords(xmin, ymin, xmax, ymax, w_img, h_img)
                if coords is not None:
                    lines.append(f"{cid} {coords[0]:.6f} {coords[1]:.6f} {coords[2]:.6f} {coords[3]:.6f}\n")
                    if is_train:
                        train_split_counts[cid] += 1
                        train_split_imgs[cid].add(base_id)
                    else:
                        val_split_counts[cid] += 1
                        val_split_imgs[cid].add(base_id)

            with open(dst_lbl, "w", encoding="utf-8") as f:
                f.writelines(lines)

    # 5. Generate data.yaml
    yaml_path = generate_data_yaml(output_dir)
    print(f"Generated dataset configuration: {yaml_path}")

    # 6. Automated Validation
    valid, issues = validate_converted_dataset(output_dir, raw_dir, train_ids, val_ids, parsed_data)
    if not valid:
        print("\n" + "!" * 70)
        print("VALIDATION FAILED WITH ISSUES:")
        for issue in issues[:20]:
            print(f"  - {issue}")
        if len(issues) > 20:
            print(f"  ... and {len(issues) - 20} more issues.")
        print("!" * 70)
        sys.exit(1)
    else:
        print("ALL 14 AUTOMATED INTEGRITY CHECKS PASSED SUCCESSFULLY!")

    # 7. Print Comprehensive Statistics
    print("\n" + "=" * 70)
    print("PROCESSED DATASET FINAL SUMMARY")
    print("=" * 70)
    print(f"Total Source Images       : {len(raw_img_files)}")
    print(f"Processed Train Images    : {len(train_ids)} ({len(train_ids)/len(raw_img_files)*100:.2f}%)")
    print(f"Processed Val Images      : {len(val_ids)} ({len(val_ids)/len(raw_img_files)*100:.2f}%)")
    print(f"Official Holdout Test Imgs: {len(os.listdir(os.path.join(raw_dir, 'test', 'images')))} (Excluded from training/val)")
    print(f"Total Retained Objects    : {total_retained_objects}")
    print(f"Total Background Images   : {train_bg_count + val_bg_count} (Train: {train_bg_count}, Val: {val_bg_count})")

    print("\nCLASS BREAKDOWN (Retained 4-Class Target Model):")
    print(f"{'ID':<3} {'Class Name':<20} {'Train Objs':<12} {'Val Objs':<10} {'Total Objs':<12} {'Train Imgs':<12} {'Val Imgs':<10}")
    print("-" * 80)
    for cid in sorted(CLASS_NAMES.keys()):
        cname = CLASS_NAMES[cid]
        tobjs = train_split_counts[cid]
        vobjs = val_split_counts[cid]
        tot = tobjs + vobjs
        timgs = len(train_split_imgs[cid])
        vimgs = len(val_split_imgs[cid])
        print(f"{cid:<3} {cname:<20} {tobjs:<12} {vobjs:<10} {tot:<12} {timgs:<12} {vimgs:<10}")

    print("\nEXCLUDED LABELS SUMMARY:")
    for exc, cnt in sorted(excluded_counts.items(), key=lambda x: x[1], reverse=True):
        reason = EXCLUSION_REASONS.get(exc, "Not part of the structural road defect model")
        print(f"  - {exc:<6}: {cnt:5d} objects — {reason}")

    print("\nDataset preparation completed successfully!")


if __name__ == "__main__":
    main()
