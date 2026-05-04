from __future__ import annotations


def plan_air_quality_load(rows: list[dict]) -> dict[str, object]:
    return {"target": "air_quality_time_series", "rowCount": len(rows), "strategy": "batch_insert_or_copy"}
