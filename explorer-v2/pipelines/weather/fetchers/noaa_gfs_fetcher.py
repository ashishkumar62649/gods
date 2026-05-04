from __future__ import annotations


def plan_noaa_gfs_fetch() -> dict[str, str]:
    return {
        "source": "noaa_gfs",
        "status": "planned",
        "note": "Implement GRIB/NetCDF retrieval with xarray or cfgrib when model ingest is enabled.",
    }
