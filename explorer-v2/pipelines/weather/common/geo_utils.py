from __future__ import annotations


def point_wkt(longitude: float, latitude: float) -> str:
    return f"POINT({longitude} {latitude})"
