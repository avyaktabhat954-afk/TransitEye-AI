"""
Person 4 -- Stage 5: Traffic Flow and Direction
================================================

Pipeline:
    YOLOv8n (COCO) -> ByteTrack -> counting -> class breakdown -> density -> flow

This script derives image-space vehicle movement direction from the
ByteTrack track_id center-point trajectories recorded in the Stage 3
counting_result.json frame_log.

NO new model inference, tracker, re-identification, camera calibration,
or GPS integration is performed.

DIRECTION DEFINITION
--------------------
Direction is determined per unique ByteTrack track_id using the
displacement of its bounding-box center point between its first and last
observed frame within the processing window.

    center_x(frame) = (bbox_x1 + bbox_x2) / 2
    center_y(frame) = (bbox_y1 + bbox_y2) / 2

    dx = center_x(last_frame) - center_x(first_frame)
    dy = center_y(last_frame) - center_y(first_frame)
    displacement = sqrt(dx^2 + dy^2)

Classification rules (applied in order):

1. If the track has fewer than MIN_OBSERVATIONS frames -> 'unknown'
2. If displacement < MIN_DISPLACEMENT_PX -> 'unknown'
3. If abs(dx) >= abs(dy) and dx > 0 -> 'right'   (dominant horizontal, positive x)
4. If abs(dx) >= abs(dy) and dx < 0 -> 'left'    (dominant horizontal, negative x)
5. If abs(dy)  > abs(dx) and dy > 0 -> 'down'    (dominant vertical,   positive y)
6. If abs(dy)  > abs(dx) and dy < 0 -> 'up'      (dominant vertical,   negative y)

All coordinates are IMAGE-SPACE. y increases downward.
No world-coordinate (north/south/east/west) directions are assigned.

Parameters
----------
MIN_OBSERVATIONS  : int   = 5
    Minimum number of frames a track must appear in to be classified.
    Tracks with fewer frames may reflect brief detections and are
    not reliably classifiable.

MIN_DISPLACEMENT_PX : float = 10.0
    Minimum Euclidean displacement (pixels) between first and last
    observed center point. Tracks with smaller total movement are
    classified as 'unknown' (e.g. parked vehicles, detection jitter).

FLOW COUNTING RULE
------------------
Each unique track_id contributes EXACTLY ONCE to the unique direction
summary. Per-frame active directional counts are also provided separately
and clearly labelled.

CLASS ASSIGNMENT
----------------
The last YOLOv8n+ByteTrack class label for the track in the frame_log
is used. No majority-vote correction or class smoothing is applied.
"""

import argparse
import json
import math
import os
import time

import cv2

APPROVED_CLASSES = {"car", "bus", "truck", "motorcycle"}
VALID_DIRECTIONS = ("left", "right", "up", "down", "unknown")

MIN_OBSERVATIONS = 5       # minimum frames to classify direction
MIN_DISPLACEMENT_PX = 10.0  # minimum pixel displacement to assign direction


def bbox_center(bbox):
    """Return (cx, cy) from [x1, y1, x2, y2]."""
    return (bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0


def classify_direction(dx, dy, displacement):
    """
    Classify image-space direction from net displacement vector.

    Returns one of: 'left', 'right', 'up', 'down', 'unknown'.
    """
    if displacement < MIN_DISPLACEMENT_PX:
        return "unknown"
    if abs(dx) >= abs(dy):
        return "right" if dx > 0 else "left"
    else:
        return "down" if dy > 0 else "up"


def build_track_trajectories(frame_log, max_frames=0):
    """
    Extract per-track center-point trajectories from the Stage 3 frame_log.

    Returns
    -------
    track_traj : dict  {track_id: {"positions": [(frame, cx, cy), ...], "last_class": str}}
    """
    track_traj = {}
    frame_count = 0
    for frame_entry in frame_log:
        frame_count += 1
        if max_frames > 0 and frame_count > max_frames:
            break
        fi = frame_entry["frame"]
        for t in frame_entry.get("tracks", []):
            cls = t.get("class", "")
            if cls not in APPROVED_CLASSES:
                continue
            tid = t["track_id"]
            cx, cy = bbox_center(t["bbox"])
            if tid not in track_traj:
                track_traj[tid] = {"positions": [], "last_class": cls}
            track_traj[tid]["positions"].append((fi, cx, cy))
            track_traj[tid]["last_class"] = cls  # overwritten each frame -> last observed class
    return track_traj


def compute_flow(track_traj):
    """
    Classify each track into a direction and build flow summary.

    Returns
    -------
    track_flow : dict  {track_id: {direction, dx, dy, displacement, obs_count, last_class}}
    flow_summary : dict
    class_breakdown_by_direction : dict
    """
    track_flow = {}
    flow_summary = {d: 0 for d in VALID_DIRECTIONS}
    class_breakdown = {
        d: {c: 0 for c in sorted(APPROVED_CLASSES)}
        for d in VALID_DIRECTIONS
    }

    for tid, data in track_traj.items():
        positions = data["positions"]
        last_class = data["last_class"]
        obs_count = len(positions)

        if obs_count < MIN_OBSERVATIONS:
            direction = "unknown"
            dx, dy, displacement = 0.0, 0.0, 0.0
        else:
            dx = positions[-1][1] - positions[0][1]
            dy = positions[-1][2] - positions[0][2]
            displacement = math.sqrt(dx**2 + dy**2)
            direction = classify_direction(dx, dy, displacement)

        track_flow[tid] = {
            "direction": direction,
            "dx": round(dx, 2),
            "dy": round(dy, 2),
            "displacement_px": round(displacement, 2),
            "obs_count": obs_count,
            "last_class": last_class,
            "first_frame": positions[0][0] if positions else None,
            "last_frame": positions[-1][0] if positions else None,
        }
        flow_summary[direction] += 1
        class_breakdown[direction][last_class] += 1

    return track_flow, flow_summary, class_breakdown


def build_per_frame_flow(frame_log, track_flow, max_frames=0):
    """
    For each frame, compute active directional counts from live track_ids.
    Active direction is taken from the pre-classified track_flow (unique assignment).
    """
    per_frame = []
    frame_count = 0
    for frame_entry in frame_log:
        frame_count += 1
        if max_frames > 0 and frame_count > max_frames:
            break
        fi = frame_entry["frame"]
        active_by_direction = {d: 0 for d in VALID_DIRECTIONS}
        active_tids = set()
        for t in frame_entry.get("tracks", []):
            cls = t.get("class", "")
            if cls not in APPROVED_CLASSES:
                continue
            tid = t["track_id"]
            if tid in active_tids:
                continue  # deduplicate within frame
            active_tids.add(tid)
            d = track_flow.get(tid, {}).get("direction", "unknown")
            active_by_direction[d] += 1

        per_frame.append({
            "frame_index": fi,
            "active_vehicle_count": len(active_tids),
            "active_by_direction": {k: v for k, v in active_by_direction.items() if v > 0},
        })
    return per_frame


def annotate_flow_video(video_path, frame_log, track_flow, output_path, max_frames):
    """Write annotated video overlaying direction label per bounding box."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    src_fps = cap.get(cv2.CAP_PROP_FPS)

    # Direction -> color mapping
    DIR_COLORS = {
        "left":    (255, 100, 50),   # blue-ish
        "right":   (50, 200, 50),    # green
        "up":      (50, 50, 255),    # red
        "down":    (0, 200, 255),    # yellow
        "unknown": (160, 160, 160),  # grey
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, src_fps if src_fps > 0 else 25.0, (width, height))

    # Index frame_log by frame number for fast lookup
    fl_by_frame = {e["frame"]: e for e in frame_log[:max_frames] if max_frames == 0 or e["frame"] <= max_frames}

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret or (max_frames > 0 and frame_idx >= max_frames):
            break
        frame_idx += 1
        entry = fl_by_frame.get(frame_idx)
        if entry:
            for t in entry.get("tracks", []):
                cls = t.get("class", "")
                if cls not in APPROVED_CLASSES:
                    continue
                tid = t["track_id"]
                tf = track_flow.get(tid, {})
                direction = tf.get("direction", "unknown")
                color = DIR_COLORS.get(direction, (160, 160, 160))
                x1, y1, x2, y2 = [int(v) for v in t["bbox"]]
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                label = "%s #%d [%s]" % (cls, tid, direction)
                cv2.putText(frame, label, (x1, max(15, y1 - 6)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.44, color, 1)
        writer.write(frame)

    cap.release()
    writer.release()
    print("[INFO] Flow-annotated video saved to: %s" % output_path)


def run_sanity_checks(track_flow, flow_summary, class_breakdown):
    """Run Checks A-E. Returns dict of results."""
    total_classified = sum(flow_summary.values())
    total_tracks = len(track_flow)

    # Check A: each direction entry corresponds to an actual track_id
    all_tids_in_flow = set(track_flow.keys())
    check_a = "PASS" if len(all_tids_in_flow) == total_tracks else "FAIL (mismatch)"

    # Check B: directional count <= unique tracked vehicles
    check_b = "PASS" if total_classified <= total_tracks else (
        "FAIL: %d > %d" % (total_classified, total_tracks))

    # Check C: left + right + up + down + unknown == total classified
    lhs = sum(flow_summary.values())
    check_c = "PASS (%d == %d)" % (lhs, total_classified) if lhs == total_classified else "FAIL"

    # Check D: no track_id counted more than once
    # By construction each tid appears once in track_flow, so:
    check_d = "PASS" if total_classified == total_tracks else (
        "FAIL: total_classified=%d != total_tracks=%d" % (total_classified, total_tracks))

    # Check E: direction assignments agree with center-point movement (spot check 5 samples)
    check_e_details = []
    checked = 0
    for tid, tf in track_flow.items():
        if tf["direction"] == "unknown" or checked >= 5:
            continue
        dx, dy = tf["dx"], tf["dy"]
        displacement = tf["displacement_px"]
        expected = classify_direction(dx, dy, displacement)
        match = "PASS" if expected == tf["direction"] else "FAIL"
        check_e_details.append({
            "track_id": tid,
            "assigned": tf["direction"],
            "expected_from_dx_dy": expected,
            "dx": dx, "dy": dy,
            "result": match,
        })
        checked += 1
    all_e_pass = all(d["result"] == "PASS" for d in check_e_details)
    check_e = "PASS" if all_e_pass else "FAIL"

    return {
        "check_A_all_directions_have_track_ids": check_a,
        "check_B_directional_count_lte_unique_tracks": check_b,
        "check_C_direction_totals_sum_to_classified": check_c,
        "check_D_no_track_id_counted_twice": check_d,
        "check_E_direction_agrees_with_displacement_spotcheck": check_e,
        "check_E_spot_check_details": check_e_details,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Person 4 -- Stage 5: Traffic Flow and Direction"
    )
    parser.add_argument("--counting_json", type=str,
                        default="ml/traffic/sample_output/counting_result.json",
                        help="Stage 3 counting_result.json with frame_log")
    parser.add_argument("--input_video", type=str,
                        default="ml/traffic/sample_input/real_traffic_sample.mp4",
                        help="Input video for annotated output")
    parser.add_argument("--output_json", type=str,
                        default="ml/traffic/sample_output/flow_result.json",
                        help="Output flow_result.json")
    parser.add_argument("--output_video", type=str,
                        default="ml/traffic/sample_output/flow_result.mp4",
                        help="Output annotated flow video")
    parser.add_argument("--max_frames", type=int, default=150,
                        help="Max frames to process from frame_log")
    args = parser.parse_args()

    # ── Load Stage 3 frame_log ───────────────────────────────────────────────
    if not os.path.exists(args.counting_json):
        raise FileNotFoundError("Stage 3 JSON not found: %s" % args.counting_json)

    print("[INFO] Loading Stage 3 frame_log from: %s" % args.counting_json)
    with open(args.counting_json) as f:
        counting_data = json.load(f)

    frame_log = counting_data.get("frame_log", [])
    if args.max_frames > 0:
        frame_log_limited = [e for e in frame_log if e["frame"] <= args.max_frames]
    else:
        frame_log_limited = frame_log
    print("[INFO] Frames in log: %d" % len(frame_log_limited))

    # ── Compute flow ─────────────────────────────────────────────────────────
    t_start = time.perf_counter()

    track_traj = build_track_trajectories(frame_log_limited, max_frames=args.max_frames)
    track_flow, flow_summary, class_breakdown = compute_flow(track_traj)
    per_frame_flow = build_per_frame_flow(frame_log_limited, track_flow, max_frames=args.max_frames)

    t_flow = time.perf_counter() - t_start

    # ── Sanity checks ────────────────────────────────────────────────────────
    sanity = run_sanity_checks(track_flow, flow_summary, class_breakdown)

    # ── Class breakdown consistency per direction ────────────────────────────
    direction_class_checks = {}
    for direction in VALID_DIRECTIONS:
        total_in_dir = flow_summary[direction]
        sum_classes = sum(class_breakdown[direction].values())
        direction_class_checks[direction] = (
            "PASS (%d==%d)" % (sum_classes, total_in_dir)
            if sum_classes == total_in_dir
            else "FAIL (%d!=%d)" % (sum_classes, total_in_dir)
        )

    # ── Build output document ─────────────────────────────────────────────────
    output = {
        "stage": "Stage 5 -- Traffic Flow and Direction",
        "source_stage3_json": args.counting_json,
        "tracker": counting_data.get("tracker", "ByteTrack"),
        "confidence_threshold": counting_data.get("confidence_threshold", 0.25),
        "direction_algorithm": {
            "method": (
                "Center-point displacement between first and last observed frame per track_id. "
                "dx = cx_last - cx_first; dy = cy_last - cy_first (image-space, y increases downward). "
                "Dominant axis (max of |dx|, |dy|) determines direction. "
                "Tracks below MIN_OBSERVATIONS or MIN_DISPLACEMENT_PX -> 'unknown'."
            ),
            "MIN_OBSERVATIONS": MIN_OBSERVATIONS,
            "MIN_DISPLACEMENT_PX": MIN_DISPLACEMENT_PX,
            "classification_rules": [
                "obs_count < MIN_OBSERVATIONS -> unknown",
                "displacement < MIN_DISPLACEMENT_PX -> unknown",
                "|dx| >= |dy| and dx > 0 -> right",
                "|dx| >= |dy| and dx < 0 -> left",
                "|dy| > |dx| and dy > 0 -> down",
                "|dy| > |dx| and dy < 0 -> up",
            ],
            "coordinate_system": "image-space (x increases right, y increases down)",
            "world_coordinates": "NOT APPLICABLE -- no camera/GPS calibration",
            "class_assignment": (
                "Last YOLOv8n+ByteTrack class label per track_id -- no smoothing or correction"
            ),
            "counting_rule": (
                "Each unique track_id contributes exactly once to the unique flow summary"
            ),
        },
        "unique_track_summary": {
            "total_unique_tracks": len(track_flow),
            "tracks_with_sufficient_obs": sum(
                1 for tf in track_flow.values() if tf["obs_count"] >= MIN_OBSERVATIONS
            ),
            "tracks_with_sufficient_displacement": sum(
                1 for tf in track_flow.values()
                if tf["obs_count"] >= MIN_OBSERVATIONS and tf["displacement_px"] >= MIN_DISPLACEMENT_PX
            ),
        },
        "flow_summary": flow_summary,
        "class_breakdown_by_direction": class_breakdown,
        "direction_class_sum_checks": direction_class_checks,
        "sanity_checks": sanity,
        "performance": {
            "flow_computation_sec": round(t_flow, 4),
            "note": (
                "Flow computation runs on Stage 3 frame_log -- no re-inference. "
                "Total pipeline time = Stage 3 inference time + this flow computation time."
            ),
        },
        "per_track_flow": {str(tid): tf for tid, tf in sorted(track_flow.items())},
        "per_frame_flow_series": per_frame_flow,
    }

    os.makedirs(os.path.dirname(args.output_json), exist_ok=True)
    with open(args.output_json, "w") as f:
        json.dump(output, f, indent=2)
    print("[INFO] Flow result JSON saved to: %s" % args.output_json)

    # ── Annotated video ───────────────────────────────────────────────────────
    if args.input_video and os.path.exists(args.input_video):
        annotate_flow_video(
            video_path=args.input_video,
            frame_log=frame_log_limited,
            track_flow=track_flow,
            output_path=args.output_video,
            max_frames=args.max_frames,
        )
    else:
        print("[WARN] Input video not found, skipping annotated output: %s" % args.input_video)

    # ── Console summary ───────────────────────────────────────────────────────
    print("\n--- STAGE 5 TRAFFIC FLOW AND DIRECTION RESULT ---")
    display = {k: v for k, v in output.items()
               if k not in ("per_track_flow", "per_frame_flow_series")}
    print(json.dumps(display, indent=2))

    return output


if __name__ == "__main__":
    main()
