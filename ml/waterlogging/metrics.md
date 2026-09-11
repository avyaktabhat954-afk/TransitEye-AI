# Waterlogging Model Metrics

## Dataset
- Final combined dataset: 6,363 images
- Train: 5,058
- Validation: 1,068
- Test: 237
- Classes: 1 (waterlogging)
- Polygon instances: 12,282
- Empty labels retained: 295
- Cross-split leakage: 0
- Exact duplicate image groups: 0

## Model
- Model: YOLOv8n-Seg
- Ultralytics version: 8.4.140
- Image size: 640
- Epochs: 20
- Batch size: 4
- Workers: 0
- Device: CPU
- Seed: 42

## Validation Results
- Images: 1,068
- Instances: 1,940
- Box Precision: 0.720
- Box Recall: 0.598
- Box mAP50: 0.661
- Box mAP50-95: 0.481
- Mask Precision: 0.705
- Mask Recall: 0.586
- Mask mAP50: 0.623
- Mask mAP50-95: 0.424
- Inference time: 93.4 ms/image

## Held-Out Test Results
- Images: 237
- Instances: 478
- Box Precision: 0.707
- Box Recall: 0.520
- Box mAP50: 0.568
- Box mAP50-95: 0.392
- Mask Precision: 0.700
- Mask Recall: 0.515
- Mask mAP50: 0.560
- Mask mAP50-95: 0.352
- Inference time: 153.4 ms/image

## Confidence Threshold
- Detection confidence threshold: Defined by inference configuration
- Severity is a heuristic based on detected water coverage.

## Limitations
- Performance can degrade in night/headlight glare conditions.
- Grass and non-asphalt textures can produce difficult cases.
- Out-of-domain macro water scenes may reduce reliability.
- Severity estimates are heuristic and must not be interpreted as precise water depth.
