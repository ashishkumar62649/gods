import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { parse as parseCsv } from "csv-parse/sync";

import { normalizeSourceRawFiles } from "../normalize_source_raw_files.mjs";
import { h3Indexes } from "../common/h3.mjs";
import { writeJsonl } from "../common/jsonl_writer.mjs";
import {
  EXPLORER_ROOT,
  NORMALIZED_WEATHER_ROOT,
  RAW_WEATHER_ROOT,
  WEATHER_FETCH_LOG_PATH,
  normalizedOutputPath,
} from "../common/paths.mjs";
import { readJson, toExplorerRelativePath } from "../common/raw_files.mjs";
import { OPEN_METEO_MVP_FIELDS, normalizeOpenMeteoValue } from "../common/open_meteo_mapping.mjs";

const STAGE1_COVERAGE_REPORT = join(RAW_WEATHER_ROOT, "_reports", "stage1_weather_parameter_coverage.json");
const STAGE2_REPORT_ROOT = join(NORMALIZED_WEATHER_ROOT, "_reports");
const STAGE2_SUMMARY_PATH = join(STAGE2_REPORT_ROOT, "stage2_normalization_summary.json");
const STAGE2_MARKDOWN_PATH = join(STAGE2_REPORT_ROOT, "stage2_normalization_summary.md");

const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

const OPENAQ_PARAMETER_MAP = {
  pm25: { parameter_id: "pm25", unit: "ug_m3" },
  pm10: { parameter_id: "pm10", unit: "ug_m3" },
  o3: { parameter_id: "ozone", unit: "ug_m3" },
  no2: { parameter_id: "nitrogen_dioxide", unit: "ug_m3" },
  so2: { parameter_id: "sulfur_dioxide", unit: "ug_m3" },
  co: { parameter_id: "carbon_monoxide", unit: "ug_m3" },
};

const GDACS_EVENT_MAP = {
  EQ: { event_type: "earthquake", parameter_id: "earthquake_magnitude" },
  FL: { event_type: "flood", parameter_id: "flood_warnings" },
  TC: { event_type: "cyclone", parameter_id: "cyclone_location" },
  VO: { event_type: "volcano", parameter_id: "volcanic_eruption_event" },
  WF: { event_type: "wildfire", parameter_id: "active_fire_location" },
};

const NWPS_NO_DATA_VALUES = new Set([-999, -9999]);

const VOLCANO_ALERT_SCORE = {
  UNASSIGNED: 0,
  GREEN: 10,
  NORMAL: 10,
  YELLOW: 35,
  ADVISORY: 35,
  ORANGE: 70,
  WATCH: 70,
  RED: 95,
  WARNING: 95,
};

function runStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}

function recordId(family, row) {
  return sha(JSON.stringify([
    family,
    row.source_id,
    row.parameter_id || row.event_type,
    row.event_id || row.station_id || row.raw_file_path,
    row.time_index || row.valid_time || row.observed_time,
    row.latitude ?? row.centroid_latitude,
    row.longitude ?? row.centroid_longitude,
    row.value,
  ]));
}

function toIso(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function oneOrMany(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function latestEntry(entries) {
  return [...entries]
    .filter((entry) => entry?.rawFilePath)
    .sort((a, b) => Date.parse(b.fetchedAt || 0) - Date.parse(a.fetchedAt || 0))[0] || null;
}

function flattenCoordinates(geometry) {
  const points = [];
  function visit(value) {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      points.push([value[0], value[1]]);
      return;
    }
    for (const item of value) visit(item);
  }
  visit(geometry?.coordinates);
  return points;
}

function centroid(geometry) {
  if (!geometry) return { latitude: null, longitude: null };
  if (geometry.type === "Point") {
    return {
      latitude: numberOrNull(geometry.coordinates?.[1]),
      longitude: numberOrNull(geometry.coordinates?.[0]),
    };
  }
  const points = flattenCoordinates(geometry);
  if (!points.length) return { latitude: null, longitude: null };
  const sum = points.reduce((acc, [lon, lat]) => ({ lon: acc.lon + lon, lat: acc.lat + lat }), { lon: 0, lat: 0 });
  return {
    latitude: sum.lat / points.length,
    longitude: sum.lon / points.length,
  };
}

function h3Both(latitude, longitude) {
  const h3 = h3Indexes(latitude, longitude);
  return {
    ...h3,
    h3_res_5: h3.h3_res5,
    h3_res_6: h3.h3_res6,
    h3_res_7: h3.h3_res7,
    h3_res_8: h3.h3_res8,
  };
}

async function readMetadata(rawFilePath) {
  const metadataPath = `${rawFilePath}.metadata.json`;
  if (!existsSync(metadataPath)) return {};
  return JSON.parse(await readFile(metadataPath, "utf8"));
}

function lineage(entry, metadata) {
  const rawFilePath = entry.rawFilePath || metadata.rawFilePath;
  return {
    source_id: entry.source,
    source_family: null,
    raw_file_path: toExplorerRelativePath(rawFilePath),
    checksum_sha256: entry.checksumSha256 || metadata.checksumSha256 || null,
    fetched_at: entry.fetchedAt || metadata.fetchedAt || null,
    payload_lineage: {
      data_type: entry.dataType,
      folder: entry.folder,
      endpoint: entry.endpoint,
      metadata_path: toExplorerRelativePath(entry.metadataPath || metadata.metadataPath),
    },
  };
}

function withRecordId(family, row) {
  return {
    id: recordId(family, row),
    ...row,
  };
}

function sourceEntries(fetchLog, sourceId, predicate = () => true) {
  return fetchLog.filter((entry) => (
    entry.source === sourceId
    && entry.status === "success"
    && entry.rawFilePath
    && predicate(entry)
  ));
}

async function loadFetchLog() {
  const text = await readFile(WEATHER_FETCH_LOG_PATH, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function normalizeOpenMeteo(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const latitude = numberOrNull(payload.latitude);
  const longitude = numberOrNull(payload.longitude);
  const h3 = h3Both(latitude, longitude);
  const rows = [];

  function pushField(section, field, value, unit, time) {
    const mapping = OPEN_METEO_MVP_FIELDS[field];
    if (!mapping) return;
    const normalizedValue = normalizeOpenMeteoValue(value, unit, mapping.canonical_unit);
    if (normalizedValue === null) return;
    const validTime = toIso(time);
    rows.push(withRecordId("weather_time_series", {
      ...base,
      parameter_id: mapping.parameter_id,
      value: normalizedValue,
      unit: mapping.canonical_unit,
      original_value: String(value),
      original_unit: unit || null,
      latitude,
      longitude,
      ...h3,
      observed_time: section === "current" ? validTime : null,
      valid_time: validTime,
      forecast_time: section === "hourly" ? validTime : null,
      model_run_time: null,
      time_index: validTime,
      ingested_at: new Date().toISOString(),
      value_kind: section === "hourly" ? "forecast" : "observation",
      confidence_score: 0.85,
      quality_flag: "stage2_jsonl",
      payload: {
        ...base.payload_lineage,
        source_field: field,
        source_section: section,
        source_timezone: payload.timezone || null,
        elevation: payload.elevation ?? null,
      },
    }));
  }

  for (const field of Object.keys(OPEN_METEO_MVP_FIELDS)) {
    if (payload.current && field in payload.current) {
      pushField("current", field, payload.current[field], payload.current_units?.[field], payload.current.time);
    }
    const values = payload.hourly?.[field];
    if (Array.isArray(values)) {
      for (let index = 0; index < values.length; index += 1) {
        pushField("hourly", field, values[index], payload.hourly_units?.[field], payload.hourly?.time?.[index]);
      }
    }
  }

  return rows;
}

async function normalizeUsgsEarthquake(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const features = payload.type === "FeatureCollection" ? payload.features || [] : payload.type === "Feature" ? [payload] : [];
  return features.map((feature) => {
    const props = feature.properties || {};
    const latitude = numberOrNull(feature.geometry?.coordinates?.[1]);
    const longitude = numberOrNull(feature.geometry?.coordinates?.[0]);
    const depthKm = numberOrNull(feature.geometry?.coordinates?.[2]);
    const eventId = feature.id || props.code || props.ids || null;
    const observedTime = toIso(props.time);
    return withRecordId("hazard_events", {
      ...base,
      parameter_id: "earthquake_magnitude",
      event_type: "earthquake",
      event_id: eventId,
      source_event_id: props.code || eventId,
      title: props.title || props.place || "USGS earthquake",
      description: props.place || null,
      hazard_type: "earthquake",
      severity: props.alert || null,
      severity_score: numberOrNull(props.sig),
      magnitude: numberOrNull(props.mag),
      value: numberOrNull(props.mag),
      unit: "magnitude",
      category: props.magType || null,
      status: props.status || null,
      started_at: observedTime,
      observed_time: observedTime,
      valid_time: observedTime,
      updated_time: toIso(props.updated),
      time_index: observedTime,
      centroid_latitude: latitude,
      centroid_longitude: longitude,
      latitude,
      longitude,
      geometry: feature.geometry || null,
      ...h3Both(latitude, longitude),
      confidence_score: 0.9,
      payload: {
        ...base.payload_lineage,
        depth_km: depthKm,
        url: props.url || null,
        detail_url: props.detail || null,
        tsunami: props.tsunami ?? null,
        raw_properties: props,
      },
    });
  });
}

function nwsParameterId(props) {
  const event = String(props.event || "");
  if (/warning/i.test(event)) return "weather_warnings";
  if (/watch/i.test(event)) return "weather_watches";
  if (/advisory|statement/i.test(event)) return "meteorological_advisories";
  return "weather_alerts";
}

async function normalizeNwsAlerts(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  return (payload.features || []).map((feature) => {
    const props = feature.properties || {};
    const center = centroid(feature.geometry);
    const validTime = toIso(props.effective || props.sent);
    return withRecordId("hazard_events", {
      ...base,
      parameter_id: nwsParameterId(props),
      event_type: "nws_alert",
      event_id: props.id || feature.id || null,
      source_event_id: feature.id || props["@id"] || null,
      title: props.headline || props.event || "NWS alert",
      description: props.description || null,
      hazard_type: props.event || "weather_alert",
      severity: props.severity || null,
      category: props.category || null,
      status: props.status || null,
      started_at: toIso(props.onset || props.effective),
      observed_time: toIso(props.sent),
      valid_time: validTime,
      issued_time: toIso(props.sent),
      expires_time: toIso(props.expires),
      ended_at: toIso(props.ends),
      time_index: validTime,
      centroid_latitude: center.latitude,
      centroid_longitude: center.longitude,
      latitude: center.latitude,
      longitude: center.longitude,
      geometry: feature.geometry || null,
      ...h3Both(center.latitude, center.longitude),
      confidence_score: 0.85,
      payload: {
        ...base.payload_lineage,
        area_desc: props.areaDesc || null,
        certainty: props.certainty || null,
        urgency: props.urgency || null,
        response: props.response || null,
        sender_name: props.senderName || null,
        instruction: props.instruction || null,
        parameters: props.parameters || {},
      },
    });
  });
}

function gdacsItemValue(value) {
  if (value && typeof value === "object") return value["#text"] ?? value["@_value"] ?? null;
  return value ?? null;
}

async function normalizeGdacsXml(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const xml = await readFile(entry.rawFilePath, "utf8");
  const parsed = XML_PARSER.parse(xml);
  const items = oneOrMany(parsed.rss?.channel?.item);
  return items.map((item) => {
    const eventCode = String(item["gdacs:eventtype"] || "").toUpperCase();
    const eventMap = GDACS_EVENT_MAP[eventCode] || { event_type: eventCode.toLowerCase() || "gdacs_event", parameter_id: "weather_alerts" };
    const latitude = numberOrNull(item["geo:Point"]?.["geo:lat"] ?? String(item["georss:point"] || "").split(/\s+/)[0]);
    const longitude = numberOrNull(item["geo:Point"]?.["geo:long"] ?? String(item["georss:point"] || "").split(/\s+/)[1]);
    const validTime = toIso(item["gdacs:fromdate"] || item.pubDate);
    const severityValue = numberOrNull(item["gdacs:severity"]?.["@_value"]);
    return withRecordId("hazard_events", {
      ...base,
      parameter_id: eventMap.parameter_id,
      event_type: eventMap.event_type,
      event_id: String(gdacsItemValue(item.guid) || item["gdacs:eventid"] || ""),
      source_event_id: String(item["gdacs:eventid"] || ""),
      title: item.title || "GDACS event",
      description: item.description || null,
      hazard_type: eventMap.event_type,
      severity: item["gdacs:alertlevel"] || item["gdacs:episodealertlevel"] || null,
      severity_score: numberOrNull(item["gdacs:alertscore"] ?? item["gdacs:episodealertscore"]),
      magnitude: eventCode === "EQ" ? severityValue : null,
      value: severityValue,
      unit: item["gdacs:severity"]?.["@_unit"] || null,
      category: eventCode || null,
      status: item["gdacs:iscurrent"] === false ? "inactive" : "current",
      started_at: validTime,
      observed_time: toIso(item.pubDate),
      valid_time: validTime,
      updated_time: toIso(item["gdacs:datemodified"]),
      ended_at: toIso(item["gdacs:todate"]),
      time_index: validTime,
      centroid_latitude: latitude,
      centroid_longitude: longitude,
      latitude,
      longitude,
      geometry: latitude !== null && longitude !== null ? { type: "Point", coordinates: [longitude, latitude] } : null,
      ...h3Both(latitude, longitude),
      confidence_score: 0.82,
      payload: {
        ...base.payload_lineage,
        link: item.link || null,
        country: item["gdacs:country"] || null,
        iso3: item["gdacs:iso3"] || null,
        population: item["gdacs:population"] || null,
        raw_subject: item["dc:subject"] || null,
      },
    });
  });
}

async function normalizeGdacsGeoJson(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const eventType = entry.dataType.includes("wildfire") ? "wildfire" : entry.dataType.includes("volcano") ? "volcano" : "gdacs_event";
  const parameterId = eventType === "wildfire" ? "active_fire_location" : eventType === "volcano" ? "volcanic_eruption_event" : "weather_alerts";
  return (payload.features || []).map((feature) => {
    const props = feature.properties || {};
    const center = centroid(feature.geometry);
    const validTime = toIso(props.fromdate || props.pubDate || props.date);
    return withRecordId("hazard_events", {
      ...base,
      parameter_id: parameterId,
      event_type: eventType,
      event_id: String(feature.id || props.eventid || props.id || ""),
      source_event_id: String(props.eventid || feature.id || ""),
      title: props.name || props.title || `${eventType} event`,
      description: props.description || null,
      hazard_type: eventType,
      severity: props.alertlevel || props.alertLevel || null,
      status: props.iscurrent === false ? "inactive" : "current",
      valid_time: validTime,
      time_index: validTime || base.fetched_at,
      centroid_latitude: center.latitude,
      centroid_longitude: center.longitude,
      latitude: center.latitude,
      longitude: center.longitude,
      geometry: feature.geometry || null,
      ...h3Both(center.latitude, center.longitude),
      confidence_score: 0.8,
      payload: {
        ...base.payload_lineage,
        raw_properties: props,
      },
    });
  });
}

async function normalizeOpenAq(entry) {
  const parameterName = entry.dataType.replace(/^latest_/, "");
  const mapping = OPENAQ_PARAMETER_MAP[parameterName];
  if (!mapping) return { rows: [], rejected: [] };
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const rows = [];
  const rejected = [];
  for (const item of payload.results || []) {
    const value = numberOrNull(item.value);
    if (value === null || value < 0) {
      rejected.push({ reason: "non_numeric_or_negative_value", item });
      continue;
    }
    const latitude = numberOrNull(item.coordinates?.latitude);
    const longitude = numberOrNull(item.coordinates?.longitude);
    const observedTime = toIso(item.datetime?.utc);
    rows.push(withRecordId("air_quality_time_series", {
      ...base,
      parameter_id: mapping.parameter_id,
      station_id: String(item.locationsId || item.sensorsId || ""),
      observed_time: observedTime,
      valid_time: observedTime,
      time_index: observedTime,
      ingested_at: new Date().toISOString(),
      latitude,
      longitude,
      ...h3Both(latitude, longitude),
      value,
      unit: mapping.unit,
      original_value: String(item.value),
      original_unit: mapping.unit,
      quality_flag: "stage2_jsonl",
      confidence_score: 0.75,
      payload: {
        ...base.payload_lineage,
        sensors_id: item.sensorsId || null,
        locations_id: item.locationsId || null,
        datetime_local: item.datetime?.local || null,
      },
    }));
  }
  return { rows, rejected };
}

async function normalizeUsgsWater(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const rows = [];
  for (const series of payload.value?.timeSeries || []) {
    const site = series.sourceInfo || {};
    const variable = series.variable || {};
    const variableCode = variable.variableCode?.[0]?.value || null;
    const parameterId = variableCode === "00060" ? "river_discharge" : variableCode === "00065" ? "stream_gauge_level" : "river_level";
    const latitude = numberOrNull(site.geoLocation?.geogLocation?.latitude);
    const longitude = numberOrNull(site.geoLocation?.geogLocation?.longitude);
    const siteCode = site.siteCode?.[0]?.value || null;
    for (const group of series.values || []) {
      for (const item of group.value || []) {
        const value = numberOrNull(item.value);
        if (value === null || value === numberOrNull(variable.noDataValue)) continue;
        const observedTime = toIso(item.dateTime);
        rows.push(withRecordId("hydrology_time_series", {
          ...base,
          parameter_id: parameterId,
          station_id: siteCode,
          observed_time: observedTime,
          valid_time: observedTime,
          time_index: observedTime,
          ingested_at: new Date().toISOString(),
          latitude,
          longitude,
          ...h3Both(latitude, longitude),
          value,
          unit: variable.unit?.unitCode || null,
          original_value: String(item.value),
          original_unit: variable.unit?.unitCode || null,
          quality_flag: Array.isArray(item.qualifiers) ? item.qualifiers.join(",") : null,
          confidence_score: 0.8,
          payload: {
            ...base.payload_lineage,
            site_name: site.siteName || null,
            variable_code: variableCode,
            variable_name: variable.variableName || null,
            variable_description: variable.variableDescription || null,
            qualifiers: item.qualifiers || [],
          },
        }));
      }
    }
  }
  return rows;
}

function parseCsvRecords(text) {
  return parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function firmsObservedTime(acqDate, acqTime) {
  const time = String(acqTime || "").padStart(4, "0");
  const hour = time.slice(0, 2);
  const minute = time.slice(2, 4);
  return toIso(`${acqDate}T${hour}:${minute}:00Z`);
}

function firmsConfidence(value) {
  if (value === "l") return 30;
  if (value === "n") return 60;
  if (value === "h") return 90;
  return numberOrNull(value);
}

async function normalizeNasaFirms(entry) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const text = await readFile(entry.rawFilePath, "utf8");
  const rows = [];
  for (const item of parseCsvRecords(text)) {
    const latitude = numberOrNull(item.latitude);
    const longitude = numberOrNull(item.longitude);
    if (latitude === null || longitude === null) continue;
    const observedTime = firmsObservedTime(item.acq_date, item.acq_time);
    const frp = numberOrNull(item.frp);
    const brightness = numberOrNull(item.brightness ?? item.bright_ti4);
    rows.push(withRecordId("hazard_events", {
      ...base,
      parameter_id: "active_fire_location",
      event_type: "wildfire",
      event_id: `${entry.dataType}:${latitude}:${longitude}:${observedTime}`,
      source_event_id: null,
      title: `NASA FIRMS active fire ${item.instrument || ""}`.trim(),
      description: null,
      hazard_type: "wildfire",
      severity: String(item.confidence || "") || null,
      severity_score: firmsConfidence(item.confidence),
      magnitude: frp,
      value: frp,
      unit: "MW",
      category: item.instrument || null,
      status: "observed",
      started_at: observedTime,
      observed_time: observedTime,
      valid_time: observedTime,
      time_index: observedTime,
      centroid_latitude: latitude,
      centroid_longitude: longitude,
      latitude,
      longitude,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      ...h3Both(latitude, longitude),
      confidence_score: 0.78,
      quality_flag: "stage2_jsonl",
      payload: {
        ...base.payload_lineage,
        satellite: item.satellite || null,
        instrument: item.instrument || null,
        scan: numberOrNull(item.scan),
        track: numberOrNull(item.track),
        brightness,
        bright_t31: numberOrNull(item.bright_t31 ?? item.bright_ti5),
        daynight: item.daynight || null,
        version: item.version || null,
      },
    }));
  }
  return rows;
}

async function readNwpsGaugeMap(fetchLog) {
  const map = new Map();
  for (const entry of sourceEntries(fetchLog, "noaa_nwps", (item) => item.folder === "gauges")) {
    const gauge = await readJson(entry.rawFilePath);
    if (gauge?.lid) map.set(String(gauge.lid).toUpperCase(), gauge);
  }
  return map;
}

function nwpsGaugeId(entry) {
  return String(entry.dataType || "").split("_").at(-1)?.toUpperCase() || null;
}

function nwpsParameter(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("flow")) return "river_discharge";
  return "stream_gauge_level";
}

function nwpsUnitAndValue(name, unit, value) {
  if (value === null || NWPS_NO_DATA_VALUES.has(value)) return null;
  if (String(name || "").toLowerCase().includes("flow") && String(unit || "").toLowerCase() === "kcfs") {
    return { value: value * 1000, unit: "ft3/s", originalUnit: unit };
  }
  return { value, unit: unit || null, originalUnit: unit || null };
}

async function normalizeNoaaNwpsStageflow(entry, gaugeMap) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const stationId = nwpsGaugeId(entry);
  const gauge = stationId ? gaugeMap.get(stationId) : null;
  const latitude = numberOrNull(gauge?.latitude);
  const longitude = numberOrNull(gauge?.longitude);
  const rows = [];
  const fields = [
    { key: "primary", name: payload.primaryName, unit: payload.primaryUnits },
    { key: "secondary", name: payload.secondaryName, unit: payload.secondaryUnits },
  ];

  for (const item of payload.data || []) {
    const validTime = toIso(item.validTime);
    for (const field of fields) {
      const originalValue = numberOrNull(item[field.key]);
      const converted = nwpsUnitAndValue(field.name, field.unit, originalValue);
      if (!converted) continue;
      const isForecast = entry.folder === "forecasts";
      rows.push(withRecordId("hydrology_time_series", {
        ...base,
        parameter_id: nwpsParameter(field.name),
        station_id: stationId,
        observed_time: isForecast ? null : validTime,
        valid_time: validTime,
        forecast_time: isForecast ? validTime : null,
        model_run_time: isForecast ? toIso(payload.issuedTime || item.generatedTime) : null,
        time_index: validTime,
        ingested_at: new Date().toISOString(),
        latitude,
        longitude,
        ...h3Both(latitude, longitude),
        value: converted.value,
        unit: converted.unit,
        original_value: String(originalValue),
        original_unit: converted.originalUnit,
        quality_flag: "stage2_jsonl",
        confidence_score: isForecast ? 0.72 : 0.82,
        payload: {
          ...base.payload_lineage,
          gauge_name: gauge?.name || null,
          usgs_id: gauge?.usgsId || null,
          wfo: payload.wfo || gauge?.wfo || null,
          issued_time: payload.issuedTime || null,
          generated_time: item.generatedTime || null,
          value_field: field.key,
          value_name: field.name || null,
          flood_categories: gauge?.flood?.categories || null,
        },
      }));
    }
  }
  return rows;
}

async function readDartStationMap(fetchLog) {
  const entry = latestEntry(sourceEntries(fetchLog, "noaa_dart", (item) => item.folder === "stations"));
  if (!entry) return new Map();
  const xml = await readFile(entry.rawFilePath, "utf8");
  const parsed = XML_PARSER.parse(xml);
  const stations = oneOrMany(parsed.stations?.station);
  return new Map(stations.map((station) => [String(station["@_id"] || ""), station]));
}

async function normalizeNoaaDartRealtime(entry, stationMap) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const stationId = String(entry.dataType || "").replace(/^dart_/, "");
  const station = stationMap.get(stationId);
  const latitude = numberOrNull(station?.["@_lat"]);
  const longitude = numberOrNull(station?.["@_lon"]);
  const text = await readFile(entry.rawFilePath, "utf8");
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 8) continue;
    const [year, month, day, hour, minute, second, transmissionType, height] = parts;
    const observedTime = toIso(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
    const value = numberOrNull(height);
    if (value === null) continue;
    rows.push(withRecordId("hydrology_time_series", {
      ...base,
      parameter_id: "ocean_water_level",
      station_id: stationId,
      observed_time: observedTime,
      valid_time: observedTime,
      time_index: observedTime,
      ingested_at: new Date().toISOString(),
      latitude,
      longitude,
      ...h3Both(latitude, longitude),
      value,
      unit: "m",
      original_value: String(height),
      original_unit: "m",
      quality_flag: `T=${transmissionType}`,
      confidence_score: 0.78,
      payload: {
        ...base.payload_lineage,
        station_name: station?.["@_name"] || null,
        station_type: station?.["@_type"] || null,
        owner: station?.["@_owner"] || null,
        program: station?.["@_pgm"] || null,
        transmission_type: transmissionType,
      },
    }));
  }
  return rows;
}

async function readUsgsVolcanoReference(fetchLog) {
  const entry = latestEntry(sourceEntries(fetchLog, "usgs_volcano", (item) => item.folder === "volcano_reference"));
  const byVnum = new Map();
  if (!entry) return byVnum;
  const payload = await readJson(entry.rawFilePath);
  for (const feature of payload.features || []) {
    const props = feature.properties || {};
    if (props.vnum) byVnum.set(String(props.vnum), { feature, props });
  }
  return byVnum;
}

function volcanoSeverityScore(...values) {
  return values.reduce((best, value) => {
    const key = String(value || "").toUpperCase();
    return Math.max(best, VOLCANO_ALERT_SCORE[key] ?? 0);
  }, 0);
}

function volcanoReferencePoint(reference) {
  const geometry = reference?.feature?.geometry;
  return {
    latitude: numberOrNull(geometry?.coordinates?.[1]),
    longitude: numberOrNull(geometry?.coordinates?.[0]),
    geometry: geometry || null,
  };
}

function volcanoAlertRow(base, item, reference, suffix = "") {
  const point = volcanoReferencePoint(reference);
  const observedTime = toIso(item.sent_utc || item.sentUtc || item.sent_unixtime || item.sentUnixTime);
  const volcanoName = item.volcano_name || item.volcanoName || reference?.props?.volcanoName || "USGS volcano";
  const colorCode = item.color_code || item.colorCode || reference?.props?.colorCode || null;
  const alertLevel = item.alert_level || item.alertLevel || reference?.props?.alertLevel || null;
  return withRecordId("hazard_events", {
    ...base,
    parameter_id: "volcanic_eruption_event",
    event_type: "volcano_alert",
    event_id: `${item.notice_identifier || item.noticeIdentifier || item.vnum || volcanoName}${suffix}`,
    source_event_id: item.notice_identifier || item.noticeIdentifier || item.vnum || null,
    title: `${volcanoName} ${alertLevel || colorCode || "volcano notice"}`.trim(),
    description: item.synopsis || item.noticeCategory || null,
    hazard_type: "volcano",
    severity: alertLevel || colorCode,
    severity_score: volcanoSeverityScore(alertLevel, colorCode),
    category: item.notice_type_cd || item.noticeTypeCd || item.noticeType || null,
    status: "current",
    started_at: observedTime,
    observed_time: observedTime,
    valid_time: observedTime,
    updated_time: observedTime,
    time_index: observedTime,
    centroid_latitude: point.latitude,
    centroid_longitude: point.longitude,
    latitude: point.latitude,
    longitude: point.longitude,
    geometry: point.geometry,
    ...h3Both(point.latitude, point.longitude),
    value: volcanoSeverityScore(alertLevel, colorCode),
    unit: "severity_score",
    confidence_score: 0.84,
    quality_flag: "stage2_jsonl",
    payload: {
      ...base.payload_lineage,
      vnum: item.vnum || reference?.props?.vnum || null,
      volcano_code: item.volcanoCd || reference?.props?.volcanoCd || null,
      color_code: colorCode,
      alert_level: alertLevel,
      observatory: item.obs_abbr || item.obs || null,
      observatory_name: item.obs_fullname || item.obsFullname || null,
      notice_url: item.notice_url || item.notice_url || reference?.props?.noticeUrl || null,
      volcano_url: reference?.props?.volcanoUrl || null,
      nvews_threat: reference?.props?.nvewsThreat || null,
    },
  });
}

async function normalizeUsgsVolcanoAlerts(entry, referenceByVnum) {
  const metadata = await readMetadata(entry.rawFilePath);
  const base = lineage(entry, metadata);
  const payload = await readJson(entry.rawFilePath);
  const rows = [];

  if (entry.folder === "alerts") {
    for (const item of payload || []) {
      rows.push(volcanoAlertRow(base, item, referenceByVnum.get(String(item.vnum || ""))));
    }
    return rows;
  }

  for (const notice of payload || []) {
    for (const section of oneOrMany(notice.sections)) {
      rows.push(volcanoAlertRow(
        base,
        {
          ...notice,
          ...section,
          sentUtc: notice.sentUtc,
          noticeIdentifier: notice.noticeIdentifier,
        },
        referenceByVnum.get(String(section.vnum || "")),
        `:${section.vnum || section.volcanoName || ""}`,
      ));
    }
  }
  return rows;
}

function dedupeRows(rows) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    const key = row.id || JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(row);
  }
  return output;
}

async function normalizeSelectedSources(fetchLog) {
  const rejected = [];
  const weatherRows = [];
  const hazardRows = [];
  const airRows = [];
  const hydroRows = [];
  const nwpsGaugeMap = await readNwpsGaugeMap(fetchLog);
  const dartStationMap = await readDartStationMap(fetchLog);
  const volcanoReferenceByVnum = await readUsgsVolcanoReference(fetchLog);

  for (const entry of sourceEntries(fetchLog, "open_meteo")) {
    weatherRows.push(...await normalizeOpenMeteo(entry));
  }

  for (const entry of sourceEntries(fetchLog, "usgs_earthquake", (item) => item.expectedFormat === "geojson" || item.expectedFormat === "json")) {
    hazardRows.push(...await normalizeUsgsEarthquake(entry));
  }

  for (const entry of sourceEntries(fetchLog, "noaa_nws", (item) => item.folder === "alerts")) {
    hazardRows.push(...await normalizeNwsAlerts(entry));
  }

  for (const entry of sourceEntries(fetchLog, "gdacs")) {
    if (entry.expectedFormat === "xml") hazardRows.push(...await normalizeGdacsXml(entry));
    if (entry.expectedFormat === "geojson") hazardRows.push(...await normalizeGdacsGeoJson(entry));
  }

  for (const entry of sourceEntries(fetchLog, "nasa_firms", (item) => item.folder === "active_fires")) {
    hazardRows.push(...await normalizeNasaFirms(entry));
  }

  for (const entry of sourceEntries(fetchLog, "usgs_volcano", (item) => item.folder === "alerts" || item.folder === "notices")) {
    hazardRows.push(...await normalizeUsgsVolcanoAlerts(entry, volcanoReferenceByVnum));
  }

  for (const entry of sourceEntries(fetchLog, "openaq", (item) => item.folder === "latest")) {
    const result = await normalizeOpenAq(entry);
    airRows.push(...result.rows);
    rejected.push(...result.rejected.map((item) => ({ ...item, source: "openaq", dataType: entry.dataType })));
  }

  for (const entry of sourceEntries(fetchLog, "usgs_water", (item) => item.folder === "instant_values")) {
    hydroRows.push(...await normalizeUsgsWater(entry));
  }

  for (const entry of sourceEntries(fetchLog, "noaa_nwps", (item) => item.folder === "observations" || item.folder === "forecasts")) {
    hydroRows.push(...await normalizeNoaaNwpsStageflow(entry, nwpsGaugeMap));
  }

  for (const entry of sourceEntries(fetchLog, "noaa_dart", (item) => item.folder === "dart_realtime")) {
    hydroRows.push(...await normalizeNoaaDartRealtime(entry, dartStationMap));
  }

  return {
    weather_time_series: dedupeRows(weatherRows),
    hazard_events: dedupeRows(hazardRows),
    air_quality_time_series: dedupeRows(airRows),
    hydrology_time_series: dedupeRows(hydroRows),
    rejected,
  };
}

async function lockCoverageManifest(stamp) {
  if (!existsSync(STAGE1_COVERAGE_REPORT)) return null;
  const target = join(NORMALIZED_WEATHER_ROOT, "manifests", `weather_parameter_coverage_locked_${stamp}.json`);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(STAGE1_COVERAGE_REPORT, target);
  return target;
}

function markdownSummary(summary) {
  const rows = Object.entries(summary.outputs)
    .map(([family, details]) => `| ${family} | ${details.count} | ${details.path.replaceAll("\\", "/")} |`);
  return [
    "# Stage 2 Normalization Summary",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "| Family | Rows | Output |",
    "| --- | ---: | --- |",
    ...rows,
    "",
    `Rejected rows: ${summary.rejectedCount}`,
    `Coverage lock: ${summary.coverageLockPath || "not found"}`,
    "",
  ].join("\n");
}

export async function runStage2JsonlPipeline({ stamp = runStamp() } = {}) {
  const sourceRawFiles = await normalizeSourceRawFiles({ stamp, writeDatabase: false });
  const fetchLog = await loadFetchLog();
  const normalized = await normalizeSelectedSources(fetchLog);
  const outputs = {
    source_raw_files: {
      count: sourceRawFiles.outputCount,
      path: sourceRawFiles.outputPath,
    },
  };

  for (const family of ["weather_time_series", "hazard_events", "air_quality_time_series", "hydrology_time_series"]) {
    const outputPath = normalizedOutputPath(family, stamp);
    await writeJsonl(outputPath, normalized[family]);
    outputs[family] = {
      count: normalized[family].length,
      path: outputPath,
    };
  }

  const rejectedPath = join(NORMALIZED_WEATHER_ROOT, "_rejected", `stage2_rejected_${stamp}.jsonl`);
  await writeJsonl(rejectedPath, normalized.rejected);
  const coverageLockPath = await lockCoverageManifest(stamp);
  const summary = {
    generatedAt: new Date().toISOString(),
    stamp,
    sourceFetchLogPath: WEATHER_FETCH_LOG_PATH,
    coverageLockPath,
    outputs,
    rejectedCount: normalized.rejected.length,
    rejectedPath,
    notes: [
      "Temporary JSONL only; no database writes were performed.",
      "GDACS RSS/XML and NOAA DART station XML are normalized with fast-xml-parser; empty GeoJSON/CSV feeds produce zero rows.",
      "NASA FIRMS, NOAA/NWPS, NOAA DART, and USGS Volcano are included in this expanded pass.",
      "OpenAQ negative values are rejected as invalid measurements.",
    ],
  };
  await mkdir(STAGE2_REPORT_ROOT, { recursive: true });
  await writeFile(STAGE2_SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(STAGE2_MARKDOWN_PATH, markdownSummary(summary), "utf8");
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(await runStage2JsonlPipeline(), null, 2));
}
