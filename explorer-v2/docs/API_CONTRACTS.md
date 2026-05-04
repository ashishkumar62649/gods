# API Contracts

The preferred public API namespace is `/api/v2`.

The backend API stack is Node.js with Express.

## Stable Groups

- `/api/v2/aviation`
- `/api/v2/weather`
- `/api/v2/satellites`
- `/api/v2/maritime`
- `/api/v2/hazards`
- `/api/v2/infrastructure`
- `/api/v2/locations`
- `/api/v2/source-health`
- `/api/v2/aviation/flights/live.bin`
- `/api/v2/satellites/live.bin`
- `/api/v2/maritime/live.bin`
- `/api/v2/weather/tiles/:z/:x/:y.mvt`
- `/api/v2/hazards/tiles/:z/:x/:y.mvt`
- `/api/v2/infrastructure/cables/tiles/:z/:x/:y.mvt`

Legacy `/api/...` routes may remain during migration, but new frontend work should prefer `/api/v2/...`.

## Response Shape

Use a predictable shape for list endpoints:

```json
{
  "items": [],
  "meta": {
    "count": 0,
    "timestamp": 0,
    "source": "database"
  }
}
```

Existing v1-copied routes may keep their current shapes until each route is migrated to database-backed v2 contracts.
