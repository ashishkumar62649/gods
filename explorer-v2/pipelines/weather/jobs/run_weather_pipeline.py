from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import datetime, timezone

from pipelines.weather.common.contracts import FetchRun
from pipelines.weather.common.file_utils import write_json, write_jsonl
from pipelines.weather.common.paths import DATABASE_ROOT, NORMALIZED_WEATHER_ROOT, PROCESSED_WEATHER_ROOT, RAW_WEATHER_ROOT
from pipelines.weather.fetchers.open_meteo_fetcher import fetch_open_meteo
from pipelines.weather.loaders.load_weather_to_postgres import load_weather_rows, plan_weather_load
from pipelines.weather.normalizers.normalize_weather import normalize_open_meteo_current
from pipelines.weather.validators.validate_weather_records import validate_weather_records


def planned_weather_flow() -> dict[str, object]:
    run = FetchRun(source_key="weather.python.smoke", domain="weather", status="started")
    return {
        "runtime": "python",
        "domain": "weather",
        "flow": ["fetch", "raw_audit", "normalize", "validate", "load_db", "expose_api", "render_frontend"],
        "paths": {
            "raw": str(RAW_WEATHER_ROOT),
            "processed": str(PROCESSED_WEATHER_ROOT),
            "normalized": str(NORMALIZED_WEATHER_ROOT),
            "database": str(DATABASE_ROOT),
        },
        "fetchRun": asdict(run),
        "legacyJsWeatherPipeline": "_migration/pending-review/weather-js-pipelines contains copied v1 transition assets",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="God Eyes v2 weather pipeline")
    parser.add_argument("--plan-only", action="store_true", help="print the planned pipeline flow without fetching or writing files")
    parser.add_argument("--dry-run", action="store_true", help="fetch and normalize without loading the database")
    parser.add_argument("--lat", type=float, default=28.6139, help="latitude for the smoke weather fetch")
    parser.add_argument("--lon", type=float, default=77.2090, help="longitude for the smoke weather fetch")
    args = parser.parse_args()

    if args.plan_only:
        print(json.dumps(planned_weather_flow(), indent=2, default=str))
        return 0

    run_started = datetime.now(timezone.utc)
    stamp = run_started.strftime("%Y%m%dT%H%M%SZ")
    raw_path = RAW_WEATHER_ROOT / "open_meteo" / f"open_meteo_current_{stamp}.json"
    normalized_path = NORMALIZED_WEATHER_ROOT / "weather_time_series" / f"open_meteo_current_{stamp}.jsonl"

    payload = fetch_open_meteo(args.lat, args.lon)
    write_json(raw_path, payload)
    rows = normalize_open_meteo_current(payload)
    errors = validate_weather_records(rows)
    if errors:
        print(json.dumps({"status": "validation_failed", "errors": errors, "rawPath": str(raw_path)}, indent=2))
        return 1

    write_jsonl(normalized_path, rows)
    load_result = plan_weather_load(rows) if args.dry_run else load_weather_rows(rows)
    print(json.dumps({
        **planned_weather_flow(),
        "status": "dry_run_complete" if args.dry_run else "loaded",
        "rawPath": str(raw_path),
        "normalizedPath": str(normalized_path),
        "rowCount": len(rows),
        "load": load_result,
    }, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
