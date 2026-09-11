#!/usr/bin/env python3
"""
TransitEye — Person 3 Experiment 2 Dataset Preparation Script
Applies D10-targeted image-level 5x oversampling to training set without modifying
the canonical dataset at data/processed/road_defects/ or changing validation split.
"""

import os
import sys
import shutil
import argparse
from collections import Counter, defaultdict
from PIL import Image

CANONICAL_DIR = "data/processed/road_defects"
EXPERIMENT_DIR = "data/experiments/p3_4_exp2_d10_oversampling"
DEFAULT_MULTIPLIER = 5  # 1 original copy + 4 duplicated copies = 5x representation


def parse_args():
    parser = argparse.ArgumentParser(description="Prepare P3-4 Experiment 2 (D10 Oversampling) Dataset")
    parser.add_argument("--canonical-dir", default=CANONICAL_DIR, help="Path to canonical dataset")
    parser.add_argument("--experiment-dir", default=EXPERIMENT_DIR, help="Path to output experiment dataset")
    parser.add_argument("--multiplier", type=int, default=DEFAULT_MULTIPLIER, help="Oversampling multiplier for D10 training images (default: 5)")
    return parser.parse_args()


def prepare_exp2_dataset(canonical_dir, experiment_dir, multiplier=5):
    canonical_dir = os.path.abspath(canonical_dir)
    experiment_dir = os.path.abspath(experiment_dir)

    print("==========================================================")
    print("TransitEye P3-4 Experiment 2 Dataset Generator")
    print("==========================================================")
    print(f"Canonical Dataset Dir : {canonical_dir}")
    print(f"Experiment Dataset Dir: {experiment_dir}")
    print(f"D10 Oversample Multiplier: {multiplier}x (1 original + {multiplier - 1} duplicates)")
    print("==========================================================")

    # Validate canonical dataset paths
    can_img_train = os.path.join(canonical_dir, "images", "train")
    can_lbl_train = os.path.join(canonical_dir, "labels", "train")
    can_img_val = os.path.join(canonical_dir, "images", "val")
    can_lbl_val = os.path.join(canonical_dir, "labels", "val")

    for p in [can_img_train, can_lbl_train, can_img_val, can_lbl_val]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Canonical path does not exist: {p}")

    # Prepare experiment destination directories
    exp_img_train = os.path.join(experiment_dir, "images", "train")
    exp_lbl_train = os.path.join(experiment_dir, "labels", "train")
    exp_img_val = os.path.join(experiment_dir, "images", "val")
    exp_lbl_val = os.path.join(experiment_dir, "labels", "val")

    if os.path.exists(experiment_dir):
        print(f"Cleaning existing experiment directory: {experiment_dir}")
        shutil.rmtree(experiment_dir)

    for p in [exp_img_train, exp_lbl_train, exp_img_val, exp_lbl_val]:
        os.makedirs(p, exist_ok=True)

    # 1. Process Validation Set (MUST BE EXACT COPY / UNTOUCHED)
    print("\nCopying validation set from canonical dataset (0 modifications / 0 duplicates)...")
    val_imgs = sorted([f for f in os.listdir(can_img_val) if f.endswith(".jpg")])
    for vf in val_imgs:
        base_id = os.path.splitext(vf)[0]
        shutil.copyfile(os.path.join(can_img_val, f"{base_id}.jpg"), os.path.join(exp_img_val, f"{base_id}.jpg"))
        shutil.copyfile(os.path.join(can_lbl_val, f"{base_id}.txt"), os.path.join(exp_lbl_val, f"{base_id}.txt"))
    print(f"Copied {len(val_imgs)} validation images and corresponding label files.")

    # 2. Process Training Set with D10 Oversampling
    print("\nProcessing training set and identifying D10-containing images...")
    train_lbl_files = sorted([f for f in os.listdir(can_lbl_train) if f.endswith(".txt")])

    d10_train_base_ids = set()
    train_orig_counts = Counter()
    train_orig_boxes = Counter()

    for lf in train_lbl_files:
        base_id = os.path.splitext(lf)[0]
        lbl_path = os.path.join(can_lbl_train, lf)
        with open(lbl_path, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        
        cids = [int(l.split()[0]) for l in lines]
        for cid in cids:
            train_orig_boxes[cid] += 1
        
        if 1 in cids:  # Contains transverse_crack (D10)
            d10_train_base_ids.add(base_id)

    print(f"Canonical Training Images : {len(train_lbl_files)}")
    print(f"Canonical Training Boxes  : {sum(train_orig_boxes.values())}")
    print(f"Canonical D10 Train Imgs  : {len(d10_train_base_ids)}")
    print(f"Canonical D10 Train Boxes : {train_orig_boxes[1]}")

    # Copy original training files + duplicate D10 files
    print(f"\nWriting oversampled training set to {exp_img_train}...")
    copied_train_images = 0
    over_box_counts = Counter()

    for lf in train_lbl_files:
        base_id = os.path.splitext(lf)[0]
        src_img = os.path.join(can_img_train, f"{base_id}.jpg")
        src_lbl = os.path.join(can_lbl_train, f"{base_id}.txt")

        # Copy original
        shutil.copyfile(src_img, os.path.join(exp_img_train, f"{base_id}.jpg"))
        shutil.copyfile(src_lbl, os.path.join(exp_lbl_train, f"{base_id}.txt"))
        copied_train_images += 1

        with open(src_lbl, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        for l in lines:
            over_box_counts[int(l.split()[0])] += 1

        # If D10 image, add (multiplier - 1) duplicates
        if base_id in d10_train_base_ids:
            for dup_idx in range(1, multiplier):
                dup_base_id = f"{base_id}_dup{dup_idx}"
                dst_img = os.path.join(exp_img_train, f"{dup_base_id}.jpg")
                dst_lbl = os.path.join(exp_lbl_train, f"{dup_base_id}.txt")

                shutil.copyfile(src_img, dst_img)
                shutil.copyfile(src_lbl, dst_lbl)
                copied_train_images += 1

                for l in lines:
                    over_box_counts[int(l.split()[0])] += 1

    print(f"Total Oversampled Training Images: {copied_train_images} (added {copied_train_images - len(train_lbl_files)} D10 duplicate copies)")

    # 3. Create data.yaml for Experiment 2
    rel_path = os.path.relpath(experiment_dir, os.getcwd()) if os.path.isabs(experiment_dir) else experiment_dir
    yaml_content = f"""# TransitEye Person 3 — Experiment 2 (D10 Oversampling) Dataset Configuration
# Generated automatically by scripts/prepare_p3_4_exp2_dataset.py

path: {rel_path}
train: images/train
val: images/val

names:
  0: longitudinal_crack
  1: transverse_crack
  2: alligator_crack
  3: pothole
"""
    data_yaml_path = os.path.join(experiment_dir, "data.yaml")
    with open(data_yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)
    print(f"\nGenerated dataset configuration: {data_yaml_path}")

    # 4. Integrity and Verification Checks
    print("\nRunning automated integrity verification checks...")
    issues = []

    # Check 1: Canonical dataset touched check
    can_imgs_now = len(os.listdir(can_img_train))
    if can_imgs_now != 6165:
        issues.append(f"CRITICAL: Canonical training image count altered! Expected 6165, got {can_imgs_now}")

    # Check 2: Validation leakage / count check
    exp_val_imgs = os.listdir(exp_img_val)
    if len(exp_val_imgs) != 1541:
        issues.append(f"Validation image count mismatch: expected 1541, got {len(exp_val_imgs)}")
    
    val_bases = {os.path.splitext(f)[0] for f in exp_val_imgs}
    train_bases = {os.path.splitext(f)[0] for f in os.listdir(exp_img_train)}
    
    # Strip dup suffixes for train overlap check
    train_orig_bases = {b.split("_dup")[0] for b in train_bases}
    overlap = train_orig_bases.intersection(val_bases)
    if overlap:
        issues.append(f"CRITICAL: Train and validation base IDs overlap! Count: {len(overlap)}")

    # Check 3: Box contents and class IDs
    for fname in os.listdir(exp_lbl_train):
        fpath = os.path.join(exp_lbl_train, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line: continue
                parts = line.split()
                cid = int(parts[0])
                if cid not in [0, 1, 2, 3]:
                    issues.append(f"Invalid class ID {cid} in {fname}")
                xc, yc, w, h = map(float, parts[1:])
                if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                    issues.append(f"Invalid coordinates in {fname}: {line}")

    # Check 4: Verification of exact box matching for duplicated files
    for base_id in list(d10_train_base_ids)[:10]:
        orig_lbl = os.path.join(can_lbl_train, f"{base_id}.txt")
        dup_lbl = os.path.join(exp_lbl_train, f"{base_id}_dup1.txt")
        with open(orig_lbl) as f1, open(dup_lbl) as f2:
            if f1.read() != f2.read():
                issues.append(f"Duplicate label content mismatch between {orig_lbl} and {dup_lbl}")

    if issues:
        print("!" * 60)
        print("VERIFICATION FAILED:")
        for iss in issues:
            print(f" - {iss}")
        print("!" * 60)
        sys.exit(1)
    else:
        print("ALL INTEGRITY AND ZERO-LEAKAGE CHECKS PASSED SUCCESSFULLY!")

    # Summary table
    print("\n" + "=" * 70)
    print("P3-4 EXPERIMENT 2 DATASET SUMMARY")
    print("=" * 70)
    print(f"Total Training Images: {copied_train_images} (Canonical: 6,165 + 192 D10 duplicates)")
    print(f"Total Validation Images: {len(exp_val_imgs)} (Exact canonical match)")
    print(f"Total Training Bounding Boxes: {sum(over_box_counts.values())}")
    print("\nTraining Class Distribution (Before -> After 5x Oversampling):")
    print(f"{'CID':<4} {'Class Name':<20} {'Before (Boxes)':<16} {'After (Boxes)':<16} {'Before (%)':<12} {'After (%)':<12}")
    print("-" * 80)
    class_names = {0: "longitudinal_crack", 1: "transverse_crack", 2: "alligator_crack", 3: "pothole"}
    tot_before = sum(train_orig_boxes.values())
    tot_after = sum(over_box_counts.values())
    for cid in range(4):
        b_cnt = train_orig_boxes[cid]
        a_cnt = over_box_counts[cid]
        b_pct = (b_cnt / tot_before) * 100
        a_pct = (a_cnt / tot_after) * 100
        print(f"{cid:<4} {class_names[cid]:<20} {b_cnt:<16} {a_cnt:<16} {b_pct:<11.2f}% {a_pct:<11.2f}%")
    print("=" * 70)


if __name__ == "__main__":
    args = parse_args()
    prepare_exp2_dataset(args.canonical_dir, args.experiment_dir, args.multiplier)
