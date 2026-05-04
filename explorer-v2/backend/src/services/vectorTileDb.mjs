import { getWeatherIntelPool } from './weatherIntelDb.mjs';

const EMPTY_MVT = Buffer.alloc(0);

export async function queryWeatherMvt({ z, x, y, parameter = null }) {
  const values = [z, x, y];
  const parameterFilter = parameter ? `AND w.parameter_id = $4` : '';
  if (parameter) values.push(parameter);
  return queryMvt(`
    WITH bounds AS (
      SELECT ST_TileEnvelope($1, $2, $3) AS geom
    ),
    mvtgeom AS (
      SELECT
        ST_AsMVTGeom(w.geom, bounds.geom, 4096, 64, true) AS geom,
        w.parameter_id,
        w.source_id,
        w.value,
        w.unit,
        EXTRACT(EPOCH FROM w.time_index)::bigint AS observed_epoch
      FROM weather_time_series w, bounds
      WHERE w.geom && bounds.geom
        ${parameterFilter}
      ORDER BY w.time_index DESC
      LIMIT 5000
    )
    SELECT ST_AsMVT(mvtgeom, 'weather', 4096, 'geom') AS tile
    FROM mvtgeom
    WHERE geom IS NOT NULL
  `, values);
}

export async function queryHazardsMvt({ z, x, y, eventType = null }) {
  const values = [z, x, y];
  const eventFilter = eventType ? `AND h.event_type = $4` : '';
  if (eventType) values.push(eventType);
  return queryMvt(`
    WITH bounds AS (
      SELECT ST_TileEnvelope($1, $2, $3) AS geom
    ),
    mvtgeom AS (
      SELECT
        ST_AsMVTGeom(h.geom, bounds.geom, 4096, 64, true) AS geom,
        h.event_type,
        h.source_id,
        h.title,
        h.severity,
        h.severity_score,
        EXTRACT(EPOCH FROM h.time_index)::bigint AS observed_epoch
      FROM hazard_events h, bounds
      WHERE h.geom && bounds.geom
        ${eventFilter}
      ORDER BY h.time_index DESC
      LIMIT 5000
    )
    SELECT ST_AsMVT(mvtgeom, 'hazards', 4096, 'geom') AS tile
    FROM mvtgeom
    WHERE geom IS NOT NULL
  `, values);
}

export async function queryCableMvt({ z, x, y }) {
  return queryMvt(`
    WITH bounds AS (
      SELECT ST_TileEnvelope($1, $2, $3) AS geom
    ),
    mvtgeom AS (
      SELECT
        ST_AsMVTGeom(c.geom, bounds.geom, 4096, 64, true) AS geom,
        c.cable_id,
        c.name,
        c.status,
        c.owner_operator
      FROM infrastructure.cables c, bounds
      WHERE c.geom && bounds.geom
      LIMIT 5000
    )
    SELECT ST_AsMVT(mvtgeom, 'cables', 4096, 'geom') AS tile
    FROM mvtgeom
    WHERE geom IS NOT NULL
  `, [z, x, y]);
}

async function queryMvt(sql, values) {
  const result = await getWeatherIntelPool().query(sql, values);
  const tile = result.rows[0]?.tile;
  return Buffer.isBuffer(tile) ? tile : EMPTY_MVT;
}
