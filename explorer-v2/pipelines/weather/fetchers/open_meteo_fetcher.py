from __future__ import annotations

from pipelines.weather.common.http_client import get_json


def fetch_open_meteo(latitude: float, longitude: float) -> dict:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    }
    return get_json(url, params=params)
