from __future__ import annotations


def plan_usgs_water_fetch() -> dict[str, str]:
    return {
        "source": "usgs_water",
        "status": "planned",
        "note": "USGS water observations will be fetched into data_raw/weather and normalized to hydrology records.",
    }
