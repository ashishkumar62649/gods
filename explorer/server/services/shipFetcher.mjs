import {
  AISSTREAM_API_KEY,
  AISSTREAM_URL,
} from '../config/constants.mjs';
import {
  removeStaleShips,
  setShipConnectionState,
  upsertShip,
} from '../store/infrastructureStore.mjs';

const ALLOWED_TYPE_PATTERN = /\b(research|military|tug|special)\b/i;
const vesselTypeByMmsi = new Map();

let socket = null;
let reconnectTimer = null;
let staleTimer = null;
const textDecoder = new TextDecoder('utf-8');

export function startShipStream() {
  if (staleTimer) return;

  staleTimer = setInterval(() => removeStaleShips(), 15_000);

  if (!AISSTREAM_API_KEY) {
    setShipConnectionState(false, 'AISSTREAM_API_KEY missing; maritime traffic disabled.');
    console.warn('[Ships] AISSTREAM_API_KEY missing; stream disabled.');
    return;
  }

  if (typeof WebSocket !== 'function') {
    setShipConnectionState(false, 'Global WebSocket is unavailable in this Node runtime.');
    console.warn('[Ships] Global WebSocket unavailable; upgrade Node or add a WebSocket client.');
    return;
  }

  connectShipStream();
}

function connectShipStream() {
  if (socket && socket.readyState <= 1) return;

  socket = new WebSocket(AISSTREAM_URL);

  socket.addEventListener('open', () => {
    setShipConnectionState(true);
    socket.send(JSON.stringify({
      APIKey: AISSTREAM_API_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FilterMessageTypes: [
        'PositionReport',
        'ShipStaticData',
        'StandardClassBPositionReport',
      ],
    }));
    console.log('[Ships] AIS stream connected');
  });

  socket.addEventListener('message', async (event) => {
    let rawText = null;
    try {
      rawText = await decodeAisPayload(event?.data ?? event);
      if (!rawText) return;

      handleAisMessage(JSON.parse(rawText));
    } catch (error) {
      const preview = rawText ? rawText.slice(0, 50) : '<unavailable>';
      console.error(`[Ships] AIS message parse failed: ${error.message} | preview: ${preview}`);
    }
  });

  socket.addEventListener('close', () => {
    setShipConnectionState(false, 'AIS stream disconnected.');
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    setShipConnectionState(false, 'AIS stream error.');
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer || !AISSTREAM_API_KEY) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectShipStream();
  }, 10_000);
}

function handleAisMessage(payload) {
  const metadata = payload.MetaData ?? payload.metadata ?? {};
  const message = payload.Message ?? payload.message ?? {};
  const mmsi = String(metadata.MMSI ?? message.UserID ?? message.MMSI ?? '').trim();
  if (!mmsi) return;

  const shipType = extractShipType(message, metadata);
  if (shipType) {
    vesselTypeByMmsi.set(mmsi, shipType);
  }

  const knownType = shipType ?? vesselTypeByMmsi.get(mmsi) ?? null;
  if (knownType && !isInterestingVesselType(knownType)) return;
  if (!knownType) return;

  const position = extractPosition(message, metadata);
  if (!position) return;

  upsertShip({
    vessel_id: mmsi,
    mmsi,
    name: safeStr(metadata.ShipName ?? message.Name ?? message.ShipName),
    vessel_type: knownType,
    latitude: position.latitude,
    longitude: position.longitude,
    speed_knots: position.speedKnots,
    heading_deg: position.headingDeg,
    timestamp: Math.floor(Date.now() / 1000),
    data_source: 'aisstream.io',
  });
}

function extractPosition(message, metadata) {
  const source =
    message.PositionReport ??
    message.StandardClassBPositionReport ??
    message.ExtendedClassBPositionReport ??
    message;
  const latitude = Number(source.Latitude ?? metadata.latitude ?? metadata.Latitude);
  const longitude = Number(source.Longitude ?? metadata.longitude ?? metadata.Longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    speedKnots: finiteOrNull(source.Sog ?? source.SpeedOverGround ?? source.speed),
    headingDeg: finiteOrNull(source.Cog ?? source.TrueHeading ?? source.heading),
  };
}

function extractShipType(message, metadata) {
  const staticData = message.ShipStaticData ?? message.StaticDataReport ?? message;
  const rawType =
    staticData.Type ??
    staticData.ShipType ??
    staticData.ShipAndCargoType ??
    metadata.ShipType ??
    metadata.Type;
  if (rawType == null) return null;

  if (typeof rawType === 'number') return describeShipType(rawType);
  const text = String(rawType).trim();
  const numeric = Number(text);
  return Number.isFinite(numeric) ? describeShipType(numeric) : text;
}

function describeShipType(code) {
  if (code === 35) return 'Military';
  if (code === 52) return 'Tug';
  if (code === 53) return 'Special';
  if (code === 58) return 'Medical/Research';
  if (code >= 50 && code <= 59) return 'Special';
  return `Type ${code}`;
}

function isInterestingVesselType(type) {
  return ALLOWED_TYPE_PATTERN.test(type);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeStr(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

async function decodeAisPayload(data) {
  if (typeof data === 'string') {
    return data;
  }

  if (isBlobPayload(data)) {
    return data.text();
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }

  if (data instanceof ArrayBuffer) {
    return textDecoder.decode(new Uint8Array(data));
  }

  if (ArrayBuffer.isView(data)) {
    return textDecoder.decode(data);
  }

  if (data == null) {
    return '';
  }

  return String(data);
}

function isBlobPayload(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}
