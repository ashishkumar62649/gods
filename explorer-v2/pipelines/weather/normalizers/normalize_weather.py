from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

OPEN_METEO_PARAMETER_MAP = {
    "temperature_2m": ("temperature", "degC"),
    "relative_humidity_2m": ("humidity", "%"),
    "precipitation": ("rainfall", "mm"),
    "wind_speed_10m": ("wind_speed", "km/h"),
}


def normalize_open_meteo_current(payload: dict[str, Any]) -> list[dict[str, Any]]:
    current = payload.get("current") or {}
    observed_at = current.get("time") or datetime.now(timezone.utc).isoformat()
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    rows = []
    for key, value in current.items():
        if key == "time" or value is None:
            continue
        parameter_id, unit = OPEN_METEO_PARAMETER_MAP.get(key, (key, None))
        rows.append({
            "source_key": "open_meteo",
            "source_id": "open_meteo",
            "parameter": parameter_id,
            "parameter_id": parameter_id,
            "value": value,
            "unit": unit,
            "observed_at": observed_at,
            "observed_time": observed_at,
            "time_index": observed_at,
            "latitude": latitude,
            "longitude": longitude,
            "payload": {"open_meteo_current_key": key},
        })
    return rows
