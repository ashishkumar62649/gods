from __future__ import annotations


def normalize_hydrology_records(payload: dict) -> list[dict]:
    return payload.get("value", {}).get("timeSeries", []) if isinstance(payload, dict) else []
