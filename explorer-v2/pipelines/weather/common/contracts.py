from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class FetchRun:
    source_key: str
    domain: str
    status: str = "started"
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    raw_uri: str | None = None
    record_count: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
