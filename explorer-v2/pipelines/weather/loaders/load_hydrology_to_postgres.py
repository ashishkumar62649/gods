from __future__ import annotations


def plan_hydrology_load(rows: list[dict]) -> dict[str, object]:
    return {"target": "hydrology_time_series", "rowCount": len(rows), "strategy": "batch_insert_or_copy"}
