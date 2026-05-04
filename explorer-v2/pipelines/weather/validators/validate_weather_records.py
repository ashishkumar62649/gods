from __future__ import annotations


def validate_weather_records(rows: list[dict]) -> list[str]:
    errors = []
    for index, row in enumerate(rows):
        for key in ("source_id", "parameter_id", "value", "observed_time", "time_index"):
            if key not in row:
                errors.append(f"row {index} missing {key}")
        if row.get("latitude") is not None and not -90 <= float(row["latitude"]) <= 90:
            errors.append(f"row {index} latitude out of range")
        if row.get("longitude") is not None and not -180 <= float(row["longitude"]) <= 180:
            errors.append(f"row {index} longitude out of range")
    return errors
