from __future__ import annotations

import os


DATABASE_URL = os.getenv("DATABASE_URL", "postgres://god_eyes:god_eyes_dev_password@localhost:55432/god_eyes")
