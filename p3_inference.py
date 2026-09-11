from scripts.p3_inference import detect, MODEL_PATH, CLASS_NAMES
import json
import sys

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python p3_inference.py <image_path>")
        raise SystemExit(1)

    output = detect(sys.argv[1])
    print(json.dumps(output, indent=2))
