# Waterlogging AI Module

AI-based waterlogging detection using YOLOv8n-Seg.

## Purpose
Detect waterlogged road areas and produce bounding boxes, segmentation masks, confidence, water coverage, and heuristic severity.

## Model
- YOLOv8n-Seg
- Input: 640x640
- Classes: waterlogging
- Epochs: 20
- Batch size: 4
- Device: CPU

## Files
- weights/best.pt
- classes.txt
- inference.py
- adapter.py
- sample_input/
- sample_output/
- metrics.md
- requirements.txt

## Integration
YOLOv8n-Seg -> WaterloggingDetector -> WaterloggingAdapter -> Edge Orchestrator -> Backend

The AI module does not write directly to the database.

## Limitations
Night/headlight glare, grass/non-asphalt textures, and out-of-domain water scenes can reduce reliability.

Severity is a heuristic based on water coverage and is not a precise water-depth measurement.
