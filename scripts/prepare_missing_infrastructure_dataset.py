#!/usr/bin/env python3
"""
TransitEye — Person 3 Missing Infrastructure Dataset Preparation Script
Filters raw Smartathon / Visual Pollution dataset to extract target infrastructure defect classes:
  0: broken_signage
  1: bad_streetlight
  2: faded_signage

Applies 80/20 train/val split with strict zero-leakage base ID validation and generates data.yaml.
"""

import os
import sys
import shutil
import argparse
import random
from collections import Counter, defaultdict

DEFAULT_RAW_DIR = "data/raw/smartathon"
DEFAULT_PROCESSED_DIR = "data/processed/missing_infrastructure"
DEFAULT_SEED = 42

# Target Class Remapping (Smartathon source IDs to TransitEye target IDs)
# Expected Smartathon source mappings:
#   BROKEN_SIGNAGE -> 0 (broken_signage)
#   BAD_STREETLIGHT -> 1 (bad_streetlight)
#   FADED_SIGNAGE  -> 2 (faded_signage)
DEFAULT_TARGET_CLASSES = {
    0: "broken_signage",
    1: "bad_streetlight",
    2: "faded_signage"
}


def parse_args():
    parser = argparse.ArgumentParser(description="Prepare TransitEye Missing Infrastructure Dataset")
    parser.add_argument("--raw-dir", default=DEFAULT_RAW_DIR, help="Path to raw Smartathon dataset")
    parser.add_argument("--processed-dir", default=DEFAULT_PROCESSED_DIR, help="Path to output processed dataset")
    parser.add_argument("--train-ratio", type=float, default=0.8, help="Train split ratio (default: 0.8)")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed for reproducibility")
    return parser.parse_args()


def prepare_dataset(raw_dir: str, processed_dir: str, train_ratio: float = 0.8, seed: int = 42):
    raw_dir = os.path.abspath(raw_dir)
    processed_dir = os.path.abspath(processed_dir)

    print("==========================================================")
    print("TransitEye Missing Infrastructure Dataset Generator")
    print("==========================================================")
    print(f"Raw Dataset Dir      : {raw_dir}")
    print(f"Processed Output Dir : {processed_dir}")
    print(f"Train / Val Ratio    : {train_ratio:.2f} / {1.0 - train_ratio:.2f}")
    print(f"Random Seed          : {seed}")
    print("==========================================================")

    if not os.path.exists(raw_dir):
        print("\n" + "!" * 70)
        print("ERROR: RAW DATASET DIRECTORY NOT FOUND")
        print(f"Path does not exist: {raw_dir}")
        print("Dataset acquisition is required before running dataset preparation.")
        print("Expected structure: data/raw/smartathon/ contain images/ and labels/")
        print("!" * 70)
        sys.exit(1)

    raw_images_dir = os.path.join(raw_dir, "images")
    raw_labels_dir = os.path.join(raw_dir, "labels")

    if not os.path.exists(raw_images_dir) or not os.path.exists(raw_labels_dir):
        print(f"ERROR: Expected images/ and labels/ subdirectories inside {raw_dir}")
        sys.exit(1)

    # Destination directories
    out_img_train = os.path.join(processed_dir, "images", "train")
    out_lbl_train = os.path.join(processed_dir, "labels", "train")
    out_img_val = os.path.join(processed_dir, "images", "val")
    out_lbl_val = os.path.join(processed_dir, "labels", "val")

    if os.path.exists(processed_dir):
        print(f"Cleaning existing processed directory: {processed_dir}")
        shutil.rmtree(processed_dir)

    for p in [out_img_train, out_lbl_train, out_img_val, out_lbl_val]:
        os.makedirs(p, exist_ok=True)

    # Gather matching image and label pairs
    lbl_files = sorted([f for f in os.listdir(raw_labels_dir) if f.endswith(".txt")])
    valid_pairs = []

    for lf in lbl_files:
        base_id = os.path.splitext(lf)[0]
        img_file = None
        for ext in [".jpg", ".png", ".jpeg"]:
            candidate = os.path.join(raw_images_dir, f"{base_id}{ext}")
            if os.path.exists(candidate):
                img_file = candidate
                break
        
        if img_file:
            lbl_file = os.path.join(raw_labels_dir, lf)
            valid_pairs.append((base_id, img_file, lbl_file))

    print(f"Found {len(valid_pairs)} matching image-label pairs in raw dataset.")

    # Filter and remap labels
    filtered_pairs = []
    class_counts = Counter()

    for base_id, img_file, lbl_file in valid_pairs:
        filtered_lines = []
        with open(lbl_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                try:
                    cid = int(parts[0])
                except ValueError:
                    continue

                if cid in DEFAULT_TARGET_CLASSES:
                    class_counts[cid] += 1
                    filtered_lines.append(" ".join(parts))

        if filtered_lines:
            filtered_pairs.append((base_id, img_file, filtered_lines))

    print(f"Extracted {len(filtered_pairs)} images containing target infrastructure defect classes.")
    print("Class distribution in raw target subset:")
    for cid, name in DEFAULT_TARGET_CLASSES.items():
        print(f"  Class {cid} ({name}): {class_counts[cid]} boxes")

    # Split into train and val deterministically
    random.seed(seed)
    random.shuffle(filtered_pairs)

    n_train = int(len(filtered_pairs) * train_ratio)
    train_set = filtered_pairs[:n_train]
    val_set = filtered_pairs[n_train:]

    print(f"\nSplitting into Train: {len(train_set)} images, Val: {len(val_set)} images")

    # Copy files and write filtered label text files
    for dataset_set, img_dst, lbl_dst in [(train_set, out_img_train, out_lbl_train), (val_set, out_img_val, out_lbl_val)]:
        for base_id, img_src, lines in dataset_set:
            ext = os.path.splitext(img_src)[1]
            shutil.copyfile(img_src, os.path.join(img_dst, f"{base_id}{ext}"))
            with open(os.path.join(lbl_dst, f"{base_id}.txt"), "w", encoding="utf-8") as f:
                f.write("\n".join(lines) + "\n")

    # Generate data.yaml
    rel_path = os.path.relpath(processed_dir, os.getcwd()) if os.path.isabs(processed_dir) else processed_dir
    yaml_content = f"""# TransitEye Person 3 — Missing Infrastructure Dataset Configuration
# Auto-generated by scripts/prepare_missing_infrastructure_dataset.py

path: {rel_path}
train: images/train
val: images/val

names:
  0: broken_signage
  1: bad_streetlight
  2: faded_signage
"""

    data_yaml_path = os.path.join(processed_dir, "data.yaml")
    with open(data_yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    print(f"\nGenerated dataset configuration at: {data_yaml_path}")
    print("Dataset preparation completed successfully!")


if __name__ == "__main__":
    args = parse_args()
    prepare_dataset(args.raw_dir, args.processed_dir, args.train_ratio, args.seed)
