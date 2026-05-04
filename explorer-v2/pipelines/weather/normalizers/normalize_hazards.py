from __future__ import annotations

from typing import Any
from datetime import datetime, timezone


def normalize_usgs_earthquakes(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for feature in payload.get("features", []):
        properties = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or [None, None, None]
        observed_at_ms = properties.get("time")
        observed_at = (
            datetime.fromtimestamp(observed_at_ms / 1000, tz=timezone.utc).isoformat()
            if isinstance(observed_at_ms, (int, float))
            else None
        )
        event_id = feature.get("id") or properties.get("code")
        rows.append({
            "source_key": "usgs_earthquake",
            "source_id": "usgs_earthquake",
            "event_type": "earthquake",
            "external_id": event_id,
            "event_id": f"usgs_earthquake:{event_id}",
            "title": properties.get("title"),
            "description": properties.get("place"),
            "severity": earthquake_severity(properties.get("mag")),
            "severity_score": properties.get("mag"),
            "magnitude": properties.get("mag"),
            "longitude": coordinates[0],
            "latitude": coordinates[1],
            "depth_km": coordinates[2],
            "observed_at": observed_at,
            "status": properties.get("status"),
            "payload": {"usgs": properties},
        })
    return rows


def earthquake_severity(magnitude: Any) -> str:
    try:
        value = float(magnitude)
    except (TypeError, ValueError):
        return "unknown"
    if value >= 7:
        return "critical"
    if value >= 6:
        return "high"
    if value >= 4.5:
        return "moderate"
    return "low"
