from __future__ import annotations

from pipelines.weather.common.config import DATABASE_URL


def database_settings() -> dict[str, str]:
    return {"databaseUrl": DATABASE_URL}
