from __future__ import annotations

from pipelines.weather.common.http_client import get_json


def fetch_usgs_earthquakes(feed: str = "all_hour") -> dict:
    url = f"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/{feed}.geojson"
    return get_json(url)
