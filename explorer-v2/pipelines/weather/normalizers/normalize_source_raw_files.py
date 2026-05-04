from __future__ import annotations

from pathlib import Path


def describe_raw_file(path: Path) -> dict[str, object]:
    stat = path.stat()
    return {
        "path": str(path),
        "bytes": stat.st_size,
        "suffix": path.suffix,
    }
