from __future__ import annotations

from typing import Any

import requests


def get_json(url: str, params: dict[str, Any] | None = None, timeout_seconds: int = 30) -> dict[str, Any]:
    response = requests.get(url, params=params, timeout=timeout_seconds, headers={"User-Agent": "god-eyes-v2/0.2"})
    response.raise_for_status()
    return response.json()
