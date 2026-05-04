from __future__ import annotations


from typing import TypeVar


T = TypeVar("T")


def chunked(items: list[T], size: int) -> list[list[T]]:
    return [items[index:index + size] for index in range(0, len(items), size)]
