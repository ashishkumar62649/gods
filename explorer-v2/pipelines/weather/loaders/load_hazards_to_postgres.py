from __future__ import annotations

import json
from typing import Any


def plan_hazard_load(rows: list[dict[str, Any]]) -> dict[str, object]:
    return {"target": "hazards.events", "rowCount": len(rows), "strategy": "upsert"}


def load_hazard_rows(rows: list[dict[str, Any]], database_url: str | None = None) -> dict[str, object]:
    if not rows:
        return {"target": "hazards.events", "inserted": 0, "skipped": 0}

    try:
        import psycopg
    except ImportError as error:
        raise RuntimeError("Install psycopg to load hazard rows into PostgreSQL.") from error

    if not database_url:
        from pipelines.weather.common.config import DATABASE_URL

        database_url = DATABASE_URL

    statement = """
        INSERT INTO hazards.events (
          event_id, event_type, title, description, severity, severity_score,
          magnitude, status, observed_at, latitude, longitude, geom, source_key, payload
        )
        VALUES (
          %(event_id)s, %(event_type)s, %(title)s, %(description)s, %(severity)s,
          %(severity_score)s, %(magnitude)s, %(status)s, %(observed_at)s,
          %(latitude)s, %(longitude)s,
          CASE
            WHEN %(latitude)s IS NULL OR %(longitude)s IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326)
          END,
          %(source_key)s, %(payload)s::jsonb
        )
        ON CONFLICT (event_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          severity = EXCLUDED.severity,
          severity_score = EXCLUDED.severity_score,
          magnitude = EXCLUDED.magnitude,
          status = EXCLUDED.status,
          observed_at = EXCLUDED.observed_at,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          geom = EXCLUDED.geom,
          payload = EXCLUDED.payload
    """
    prepared_rows = [{**row, "payload": json.dumps(row.get("payload", {}))} for row in rows]
    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.executemany(statement, prepared_rows)
        connection.commit()
    return {"target": "hazards.events", "inserted": len(prepared_rows), "skipped": 0}
