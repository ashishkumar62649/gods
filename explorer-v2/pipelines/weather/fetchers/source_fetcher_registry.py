from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SourceFetcher:
    source_key: str
    module: str
    status: str


WEATHER_FETCHERS: tuple[SourceFetcher, ...] = (
    SourceFetcher("open_meteo", "open_meteo_fetcher", "active"),
    SourceFetcher("noaa_nws", "noaa_nws_fetcher", "active"),
    SourceFetcher("noaa_gfs", "noaa_gfs_fetcher", "planned"),
    SourceFetcher("nasa_firms", "nasa_firms_fetcher", "requires_api_key"),
    SourceFetcher("usgs_earthquake", "usgs_earthquake_fetcher", "active"),
    SourceFetcher("usgs_water", "usgs_water_fetcher", "planned"),
)
