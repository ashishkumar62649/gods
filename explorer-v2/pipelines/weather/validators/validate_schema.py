from __future__ import annotations


def require_keys(record: dict, keys: tuple[str, ...]) -> list[str]:
    return [key for key in keys if key not in record]
