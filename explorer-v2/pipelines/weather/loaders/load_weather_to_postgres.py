from __future__ import annotations

import json
from typing import Any


def plan_weather_load(rows: list[dict[str, Any]]) -> dict[str, object]:
    return {"target": "weather_time_series", "rowCount": len(rows), "strategy": "batch_insert_or_copy"}


def load_weather_rows(rows: list[dict[str, Any]], database_url: str | None = None) -> dict[str, object]:
    if not rows:
        return {"target": "weather_time_series", "inserted": 0, "skipped": 0}

    try:
        import psycopg
    except ImportError as error:
        raise RuntimeError("Install psycopg to load weather rows into PostgreSQL.") from error

    if not database_url:
        from pipelines.weather.common.config import DATABASE_URL

        database_url = DATABASE_URL

    statement = """
        INSERT INTO weather_time_series (
          parameter_id, source_id, value, unit, latitude, longitude, geom,
          observed_time, time_index, value_kind, confidence_score, quality_flag, payload
        )
        VALUES (
          %(parameter_id)s, %(source_id)s, %(value)s, %(unit)s, %(latitude)s, %(longitude)s,
          CASE
            WHEN %(latitude)s IS NULL OR %(longitude)s IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326)
          END,
          %(observed_time)s, %(time_index)s, 'observation', %(confidence_score)s,
          %(quality_flag)s, %(payload)s::jsonb
        )
    """

    prepared_rows = [
        {
            **row,
            "confidence_score": row.get("confidence_score", 0.9),
            "quality_flag": row.get("quality_flag", "raw_current"),
            "payload": json.dumps(row.get("payload", {})),
        }
        for row in rows
    ]
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.executemany(statement, prepared_rows)
        connection.commit()
    return {"target": "weather_time_series", "inserted": len(prepared_rows), "skipped": 0}
