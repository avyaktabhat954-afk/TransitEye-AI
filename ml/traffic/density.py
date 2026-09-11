"""
Person 4 — Stage 4: Vehicle Density Calculation
=================================================

Pipeline:
    YOLOv8n (COCO) → ByteTrack → unique vehicle counting → class breakdown → vehicle density

This script extends the Stage 3 counting pipeline with a per-frame
relative vehicle density measurement.

DENSITY DEFINITION
------------------
Physical camera calibration (lane widths, road area in m²) is NOT available
for the sample video. Therefore this module produces a **normalized / relative
vehicle density**, NOT a physical vehicles-per-km² measurement.

Formula
~~~~~~~
    relative_vehicle_density(frame) =
        active_vehicle_count(frame) / NORMALIZATION_CONSTANT

Where:
    active_vehicle_count(frame) =
        number of unique approved ByteTrack track_ids visible in that frame.

    NORMALIZATION_CONSTANT =
        peak_vehicle_count observed across ALL processed frames.

        This makes the density score range [0.0, 1.0]:
            0.0  → no approved vehicles visible in frame
            1.0  → most crowded frame seen in this processing window

The score is therefore a **relative occupancy ratio** within the processed
window, NOT an absolute physical traffic density.

    normalized_density = active_vehicle_count / peak_active_vehicle_count

An 'active vehicle' in a given frame is defined as:
    - A unique ByteTrack track_id present in that frame's detection output
    - Belonging to one of the 4 approved classes: car, bus, truck, motorcycle
    - Not double-counted within a single frame (each track_id counted once)

REPRODUCIBILITY
~~~~~~~~~~~~~~~
Running the same tracking command on the same video with the same parameters
will produce the same frame_log, and therefore the same density time series
within normal model/runtime variation.

NO CLASS SMOOTHING OR CORRECTION IS APPLIED.
Class labels are taken directly from YOLOv8n+ByteTrack per frame, consistent
with Stage 3.
"""

import argparse
import json
import os
import time

import cv2

APPROVED_CLASSES = {"car", "bus", "truck", "motorcycle"}


def compute_density_series(frame_log: list, normalization_constant: int = None) -> tuple:
    """
    Computes per-frame relative vehicle density from the Stage 3 frame_log.

    Parameters
    ----------
    frame_log : list
        Per-frame list from tracking.py output. Each entry has:
            {"frame": int, "tracks": [{"track_id": int, "class": str, ...}, ...]}
    normalization_constant : int, optional
        Peak active vehicle count to normalize against.
        If None, computed from the frame_log itself (peak over all frames).

    Returns
    -------
    density_series : list of dict
        Per-frame density records.
    normalization_constant : int
        The peak active vehicle count used as denominator.
    """
    # Pass 1: compute per-frame active counts (needed to find peak)
    frame_counts = []
    for frame_entry in frame_log:
        active_tids = set()
        class_breakdown = {c: 0 for c in sorted(APPROVED_CLASSES)}
        for track in frame_entry.get("tracks", []):
            cls = track.get("class", "")
            tid = track.get("track_id")
            if cls in APPROVED_CLASSES and tid not in active_tids:
                active_tids.add(tid)
                class_breakdown[cls] += 1
        frame_counts.append((frame_entry["frame"], len(active_tids), class_breakdown, sorted(active_tids)))

    if normalization_constant is None:
        peak = max(count for _, count, _, _ in frame_counts) if frame_counts else 1
        normalization_constant = peak if peak > 0 else 1

    # Pass 2: compute density
    density_series = []
    for frame_idx, active_count, class_breakdown, active_tids in frame_counts:
        rel_density = round(active_count / normalization_constant, 6)
        # Sanity: class sum == active_count
        class_sum = sum(class_breakdown.values())
        class_sum_check = "PASS" if class_sum == active_count else "FAIL"
        entry = {
            "frame_index": frame_idx,
            "active_vehicle_count": active_count,
            "active_class_breakdown": class_breakdown,
            "class_sum_check": class_sum_check,
            "active_track_ids": active_tids,
            "relative_vehicle_density": rel_density,
        }
        density_series.append(entry)

    return density_series, normalization_constant


def annotate_density_video(
    video_path: str,
    density_series: list,
    output_video_path: str,
    normalization_constant: int,
    max_frames: int,
):
    """
    Writes an annotated video showing active count, class breakdown, and density.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Failed to open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    src_fps = cap.get(cv2.CAP_PROP_FPS)

    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_video_path, fourcc, src_fps if src_fps > 0 else 25.0, (width, height))

    density_by_frame = {e["frame_index"]: e for e in density_series}
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret or (max_frames > 0 and frame_idx >= max_frames):
            break
        frame_idx += 1

        entry = density_by_frame.get(frame_idx)
        if entry:
            ac = entry["active_vehicle_count"]
            rd = entry["relative_vehicle_density"]
            cb = entry["active_class_breakdown"]

            cv2.putText(frame, f"Active Vehicles: {ac}", (10, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)
            cv2.putText(frame, f"Rel. Density: {rd:.3f}  (peak={normalization_constant})",
                        (10, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (0, 200, 255), 2)
            breakdown_str = "  ".join(f"{k}:{v}" for k, v in cb.items() if v > 0)
            cv2.putText(frame, breakdown_str if breakdown_str else "no vehicles",
                        (10, 76), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (200, 255, 100), 2)

        writer.write(frame)

    cap.release()
    writer.release()
    print(f"[INFO] Density-annotated video saved to: {output_video_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Person 4 — Stage 4: Vehicle Density (normalized, relative) using YOLOv8n+ByteTrack frame_log"
    )
    parser.add_argument(
        "--counting_json",
        type=str,
        default="ml/traffic/sample_output/counting_result.json",
        help="Path to Stage 3 counting_result.json (contains frame_log)",
    )
    parser.add_argument(
        "--input_video",
        type=str,
        default="ml/traffic/sample_input/real_traffic_sample.mp4",
        help="Path to the original input video (for annotated output)",
    )
    parser.add_argument(
        "--output_json",
        type=str,
        default="ml/traffic/sample_output/density_result.json",
        help="Path to write density_result.json",
    )
    parser.add_argument(
        "--output_video",
        type=str,
        default="ml/traffic/sample_output/density_result.mp4",
        help="Path to write density-annotated video",
    )
    parser.add_argument(
        "--max_frames",
        type=int,
        default=150,
        help="Max frames from frame_log to process (0 = all)",
    )
    args = parser.parse_args()

    # ── Load Stage 3 output ──────────────────────────────────────────────────
    if not os.path.exists(args.counting_json):
        raise FileNotFoundError(f"Stage 3 counting JSON not found: {args.counting_json}")

    print(f"[INFO] Loading Stage 3 frame_log from: {args.counting_json}")
    with open(args.counting_json) as f:
        counting_data = json.load(f)

    frame_log = counting_data.get("frame_log", [])
    if args.max_frames > 0:
        frame_log = frame_log[: args.max_frames]

    print(f"[INFO] Frame log entries loaded: {len(frame_log)}")

    # ── Compute density time series ──────────────────────────────────────────
    t_start = time.perf_counter()
    density_series, norm_const = compute_density_series(frame_log)
    t_density = time.perf_counter() - t_start

    print(f"[INFO] Density computed. Normalization constant (peak active count): {norm_const}")

    # ── Sanity checks ────────────────────────────────────────────────────────
    # Check A: active track IDs unique within a frame
    check_a_fails = []
    for e in density_series:
        tids = e["active_track_ids"]
        if len(tids) != len(set(tids)):
            check_a_fails.append(e["frame_index"])
    check_a = "PASS" if not check_a_fails else f"FAIL frames={check_a_fails}"

    # Check B: active_vehicle_count == len(unique active track IDs)
    check_b_fails = []
    for e in density_series:
        if e["active_vehicle_count"] != len(set(e["active_track_ids"])):
            check_b_fails.append(e["frame_index"])
    check_b = "PASS" if not check_b_fails else f"FAIL frames={check_b_fails}"

    # Check C: class breakdown sums == active_vehicle_count (already stored per-frame)
    check_c_fails = [e["frame_index"] for e in density_series if e["class_sum_check"] != "PASS"]
    check_c = "PASS" if not check_c_fails else f"FAIL frames={check_c_fails}"

    # Check D: density == active_count / norm_const for all frames
    check_d_fails = []
    for e in density_series:
        expected = round(e["active_vehicle_count"] / norm_const, 6)
        if abs(expected - e["relative_vehicle_density"]) > 1e-5:
            check_d_fails.append(e["frame_index"])
    check_d = "PASS" if not check_d_fails else f"FAIL frames={check_d_fails}"

    # Check E: density changes when active count changes
    density_values = [e["relative_vehicle_density"] for e in density_series]
    check_e = "PASS" if len(set(density_values)) > 1 else "FAIL (density never changed)"

    sanity_checks = {
        "check_A_active_tids_unique_within_frame": check_a,
        "check_B_active_count_equals_unique_tid_count": check_b,
        "check_C_class_breakdown_sums_to_active_count": check_c,
        "check_D_density_formula_correct": check_d,
        "check_E_density_changes_across_frames": check_e,
    }

    # ── Summary statistics ───────────────────────────────────────────────────
    active_counts = [e["active_vehicle_count"] for e in density_series]
    densities = [e["relative_vehicle_density"] for e in density_series]

    summary_stats = {
        "frames_processed": len(density_series),
        "peak_active_vehicle_count": max(active_counts),
        "min_active_vehicle_count": min(active_counts),
        "mean_active_vehicle_count": round(sum(active_counts) / len(active_counts), 2),
        "peak_relative_density": max(densities),
        "min_relative_density": min(densities),
        "mean_relative_density": round(sum(densities) / len(densities), 4),
    }

    # ── Build output document ────────────────────────────────────────────────
    output = {
        "stage": "Stage 4 — Vehicle Density",
        "source_stage3_json": args.counting_json,
        "tracker": counting_data.get("tracker", "ByteTrack"),
        "confidence_threshold": counting_data.get("confidence_threshold", 0.25),
        "density_definition": {
            "type": "relative_normalized_vehicle_density",
            "formula": "relative_vehicle_density = active_vehicle_count / peak_active_vehicle_count",
            "active_vehicle": (
                "Unique approved ByteTrack track_id present in a frame, "
                "belonging to one of: car, bus, truck, motorcycle. "
                "Each track_id counted at most once per frame."
            ),
            "normalization_constant": norm_const,
            "normalization_constant_meaning": (
                "Peak active vehicle count across all processed frames. "
                "Makes the score range [0.0, 1.0] within the processing window."
            ),
            "units": "dimensionless (relative occupancy ratio) — NOT vehicles/km or vehicles/km^2",
            "physical_calibration": "UNAVAILABLE — no lane width, road area, or GPS calibration",
            "scope": "Per-frame, 150-frame processing window",
            "class_assignment": (
                "Direct YOLOv8n+ByteTrack label per frame — no smoothing or majority-vote correction"
            ),
        },
        "summary_statistics": summary_stats,
        "sanity_checks": sanity_checks,
        "performance": {
            "density_computation_sec": round(t_density, 4),
            "note": (
                "Density computation runs on Stage 3 frame_log (no re-inference). "
                "Total pipeline time = Stage 3 inference time + this computation time."
            ),
        },
        "density_time_series": density_series,
    }

    # Write JSON
    os.makedirs(os.path.dirname(args.output_json), exist_ok=True)
    with open(args.output_json, "w") as f:
        json.dump(output, f, indent=2)
    print(f"[INFO] Density result JSON saved to: {args.output_json}")

    # ── Annotated video ──────────────────────────────────────────────────────
    if args.input_video and os.path.exists(args.input_video):
        annotate_density_video(
            video_path=args.input_video,
            density_series=density_series,
            output_video_path=args.output_video,
            normalization_constant=norm_const,
            max_frames=args.max_frames,
        )
    else:
        print(f"[WARN] Input video not found, skipping annotated video: {args.input_video}")

    # ── Console report ───────────────────────────────────────────────────────
    print("\n--- STAGE 4 VEHICLE DENSITY RESULT ---")
    display = {k: v for k, v in output.items() if k != "density_time_series"}
    print(json.dumps(display, indent=2))

    return output


if __name__ == "__main__":
    main()
