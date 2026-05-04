from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone

from pipelines.weather.common.file_utils import write_json, write_jsonl
from pipelines.weather.common.paths import NORMALIZED_WEATHER_ROOT, RAW_WEATHER_ROOT
from pipelines.weather.fetchers.usgs_earthquake_fetcher import fetch_usgs_earthquakes
from pipelines.weather.loaders.load_hazards_to_postgres import load_hazard_rows, plan_hazard_load
from pipelines.weather.normalizers.normalize_hazards import normalize_usgs_earthquakes
from pipelines.weather.validators.validate_hazard_records import validate_hazard_records


def planned_hazard_flow() -> dict[str, object]:
    return {
        "runtime": "python",
        "domain": "hazards",
        "flow": ["fetch", "raw_audit", "normalize", "validate", "load_db", "expose_api", "render_frontend"],
        "source": "usgs_earthquake",
        "paths": {
            "raw": str(RAW_WEATHER_ROOT / "usgs_earthquake"),
            "normalized": str(NORMALIZED_WEATHER_ROOT / "hazard_events"),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="God Eyes v2 hazard pipeline")
    parser.add_argument("--plan-only", action="store_true", help="print the planned pipeline flow without fetching or writing files")
    parser.add_argument("--dry-run", action="store_true", help="fetch and normalize without loading the database")
    parser.add_argument("--feed", default="all_hour", help="USGS summary feed name, e.g. all_hour, all_day, 4.5_day")
    args = parser.parse_args()

    if args.plan_only:
        print(json.dumps(planned_hazard_flow(), indent=2))
        return 0

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    raw_path = RAW_WEATHER_ROOT / "usgs_earthquake" / f"{args.feed}_{stamp}.geojson"
    normalized_path = NORMALIZED_WEATHER_ROOT / "hazard_events" / f"usgs_earthquake_{args.feed}_{stamp}.jsonl"
    payload = fetch_usgs_earthquakes(args.feed)
    write_json(raw_path, payload)
    rows = normalize_usgs_earthquakes(payload)
    errors = validate_hazard_records(rows)
    if errors:
        print(json.dumps({"status": "validation_failed", "errors": errors, "rawPath": str(raw_path)}, indent=2))
        return 1

    write_jsonl(normalized_path, rows)
    load_result = plan_hazard_load(rows) if args.dry_run else load_hazard_rows(rows)
    print(json.dumps({
        **planned_hazard_flow(),
        "status": "dry_run_complete" if args.dry_run else "loaded",
        "rawPath": str(raw_path),
        "normalizedPath": str(normalized_path),
        "rowCount": len(rows),
        "load": load_result,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
