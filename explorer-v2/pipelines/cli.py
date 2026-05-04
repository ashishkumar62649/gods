from __future__ import annotations

import argparse
import json
from pathlib import Path


PIPELINE_ROOT = Path(__file__).resolve().parent
EXPLORER_V2_ROOT = PIPELINE_ROOT.parent


def structure_status() -> dict[str, object]:
    required = [
        PIPELINE_ROOT / "weather",
        EXPLORER_V2_ROOT / "data_raw" / "weather",
        EXPLORER_V2_ROOT / "data_processed" / "weather",
        EXPLORER_V2_ROOT / "data_normalized" / "weather",
        EXPLORER_V2_ROOT / "database" / "postgres",
    ]
    return {
        "pipelineRoot": str(PIPELINE_ROOT),
        "missing": [str(path) for path in required if not path.exists()],
        "runtime": "python",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="God Eyes v2 Python pipeline CLI")
    parser.add_argument("--check", action="store_true", help="verify pipeline structure")
    args = parser.parse_args()

    if args.check:
        status = structure_status()
        print(json.dumps(status, indent=2))
        return 0 if not status["missing"] else 1

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
