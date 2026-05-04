from __future__ import annotations

from pathlib import Path


PIPELINE_ROOT = Path(__file__).resolve().parents[1]
EXPLORER_V2_ROOT = PIPELINE_ROOT.parent
RAW_ROOT = EXPLORER_V2_ROOT / "data" / "raw"
STAGING_ROOT = EXPLORER_V2_ROOT / "data" / "staging"
REJECTED_ROOT = EXPLORER_V2_ROOT / "data" / "rejected"
DATABASE_ROOT = EXPLORER_V2_ROOT / "database" / "postgres"
