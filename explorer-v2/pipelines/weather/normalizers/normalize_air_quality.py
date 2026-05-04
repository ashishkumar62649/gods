from __future__ import annotations


def normalize_air_quality_records(payload: dict) -> list[dict]:
    return payload.get("results", []) if isinstance(payload, dict) else []
