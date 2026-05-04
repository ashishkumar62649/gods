from __future__ import annotations

from pathlib import Path


EXPLORER_V2_ROOT = Path(__file__).resolve().parents[3]
RAW_WEATHER_ROOT = EXPLORER_V2_ROOT / "data_raw" / "weather"
PROCESSED_WEATHER_ROOT = EXPLORER_V2_ROOT / "data_processed" / "weather"
NORMALIZED_WEATHER_ROOT = EXPLORER_V2_ROOT / "data_normalized" / "weather"
DATABASE_ROOT = EXPLORER_V2_ROOT / "database" / "postgres"
