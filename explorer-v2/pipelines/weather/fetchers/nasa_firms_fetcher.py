from __future__ import annotations


def plan_nasa_firms_fetch() -> dict[str, str]:
    return {
        "source": "nasa_firms",
        "status": "requires_api_key",
        "note": "NASA FIRMS fetcher will write raw fire CSV/GeoJSON payloads into data_raw/weather.",
    }
