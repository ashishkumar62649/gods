from __future__ import annotations

from pipelines.weather.common.http_client import get_json


def fetch_noaa_alerts(area: str = "US") -> dict:
    return get_json("https://api.weather.gov/alerts/active", params={"area": area})
