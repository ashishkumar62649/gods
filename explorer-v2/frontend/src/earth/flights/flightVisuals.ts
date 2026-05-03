import type { FlightRecord } from './flights';
import {
  TAR1090_CATEGORY_ICONS,
  TAR1090_COLOR_BY_ALT,
  TAR1090_OUTLINE_ADSB_COLOR,
  TAR1090_OUTLINE_WIDTH,
  TAR1090_SHAPES,
  TAR1090_TYPE_DESCRIPTION_ICONS,
  TAR1090_TYPE_DESIGNATOR_ICONS,
  type Tar1090ShapeKey,
} from './tar1090.generated';

interface IconPreset {
  shape: FlightIconKey;
  scale: number;
}

interface TarShape {
  w: number;
  h: number;
  viewBox?: string;
  strokeScale?: number;
  path?: string | string[];
  svg?: string;
  accent?: string | string[];
  accentMult?: number;
  noAspect?: boolean;
  noRotate?: boolean;
  transform?: string;
}

interface AltitudePoint {
  alt: number;
  val: number;
}

interface LightnessPoint {
  h: number;
  val: number;
}

const SVG_STROKE_WIDTH = TAR1090_OUTLINE_WIDTH * 0.75;
const DEFAULT_RENDER_SCALE = 1.16;
const SELECTED_SCALE_MULTIPLIER = 1.12;
const METERS_TO_FEET = 3.28084;

const COLOR_BY_ALT = TAR1090_COLOR_BY_ALT as unknown as {
  unknown: { h: number; s: number; l: number };
  ground: { h: number; s: number; l: number };
  air: {
    h: readonly AltitudePoint[];
    s: number;
    l: readonly LightnessPoint[];
  };
  selected: { h: number; s: number; l: number };
};

const SHAPES = TAR1090_SHAPES as unknown as Record<FlightIconKey, TarShape>;
const TYPE_DESIGNATOR_ICONS = TAR1090_TYPE_DESIGNATOR_ICONS as unknown as Record<
  string,
  readonly [FlightIconKey, number]
>;
const TYPE_DESCRIPTION_ICONS = TAR1090_TYPE_DESCRIPTION_ICONS as unknown as Record<
  string,
  readonly [FlightIconKey, number]
>;
const CATEGORY_ICONS = TAR1090_CATEGORY_ICONS as unknown as Record<
  string,
  readonly [FlightIconKey, number]
>;

function isIconTuple(value: readonly [FlightIconKey, number] | IconPreset): value is readonly [FlightIconKey, number] {
  return Array.isArray(value);
}

const ICON_LABELS: Partial<Record<FlightIconKey, string>> = {
  a319: 'Airbus A319',
  a320: 'Airbus A320',
  a321: 'Airbus A321',
  a332: 'Airbus A330',
  a359: 'Airbus A350',
  a380: 'Airbus A380',
  airliner: 'Airliner',
  b737: 'Boeing 737',
  b738: 'Boeing 737-800',
  b739: 'Boeing 737-900',
  heavy_2e: 'Heavy Twin',
  heavy_4e: 'Heavy Four-Engine',
  md11: 'MD-11 / DC-10',
  c130: 'Four-Engine Turboprop',
  single_turbo: 'Single Turboprop',
  jet_nonswept: 'Business Jet',
  jet_swept: 'Swept Jet',
  twin_large: 'Regional / Turboprop',
  twin_small: 'Twin Piston',
  cessna: 'Light Aircraft',
  helicopter: 'Helicopter',
  blackhawk: 'Heavy Helicopter',
  hi_perf: 'Military Jet',
  glider: 'Glider',
  balloon: 'Balloon',
  a400: 'Airbus A400M',
  b707: 'Rear-Engine Jet',
  uav: 'UAV',
  ground_unknown: 'Ground Vehicle',
  ground_emergency: 'Emergency Vehicle',
  ground_service: 'Service Vehicle',
  ground_tower: 'Tower / Radar',
  unknown: 'Unknown Aircraft',
};

const IMAGE_CACHE = new Map<FlightIconKey, string>();
const EMERGENCY_IMAGE_CACHE = new Map<string, string>();

export type FlightIconKey = Tar1090ShapeKey;

export function getFlightIconImage(iconKey: FlightIconKey) {
  const cached = IMAGE_CACHE.get(iconKey);
  if (cached) {
    return cached;
  }

  const shape = SHAPES[iconKey];
  const uri = svgShapeToURI(shape, '#ffffff', TAR1090_OUTLINE_ADSB_COLOR, SVG_STROKE_WIDTH);
  IMAGE_CACHE.set(iconKey, uri);
  return uri;
}

export function getEmergencyFlightIconImage(
  flight: FlightRecord,
  tone: 'red' | 'yellow',
) {
  const preset = resolveFlightIconPreset(flight);
  const cacheKey = `${preset.shape}:${tone}`;
  const cached = EMERGENCY_IMAGE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const shape = SHAPES[preset.shape];
  const fill = tone === 'red' ? '#ff2d2d' : '#ffd43b';
  const outline = tone === 'red' ? '#fff1a8' : '#7f1d1d';
  const uri = svgShapeToURI(shape, fill, outline, SVG_STROKE_WIDTH + 1);
  EMERGENCY_IMAGE_CACHE.set(cacheKey, uri);
  return uri;
}

export function getFlightIconDimensions(flight: FlightRecord, selected = false) {
  const preset = resolveFlightIconPreset(flight);
  const shape = SHAPES[preset.shape];
  const scale = DEFAULT_RENDER_SCALE * preset.scale * (selected ? SELECTED_SCALE_MULTIPLIER : 1);

  return {
    width: Math.max(10, Math.round(shape.w * scale)),
    height: Math.max(10, Math.round(shape.h * scale)),
  };
}

export function getFlightFamilyLabel(flight: FlightRecord) {
  const preset = resolveFlightIconPreset(flight);
  return ICON_LABELS[preset.shape] ?? 'Aircraft';
}

export function getFlightVisualTypeLabel(flight: FlightRecord) {
  const typeCode = normalizeToken(flight.aircraft_type);
  const model = normalizeText(flight.description);

  if (typeCode && model) {
    return `${typeCode} - ${model}`;
  }

  if (typeCode) {
    return typeCode;
  }

  if (model) {
    return model;
  }

  return getFlightFamilyLabel(flight);
}

export function getFlightIconKey(flight: FlightRecord): FlightIconKey {
  return resolveFlightIconPreset(flight).shape;
}

export function getFlightIconRotationRadians(flight: FlightRecord) {
  const preset = resolveFlightIconPreset(flight);
  const shape = SHAPES[preset.shape];

  if (shape.noRotate) {
    return 0;
  }

  return (flight.heading_true_deg * Math.PI) / 180;
}

export function getFlightAltitudeColorCss(flight: FlightRecord, selected = false) {
  const altitudeFeet = Number.isFinite(flight.altitude_baro_m)
    ? Math.max(0, flight.altitude_baro_m * METERS_TO_FEET)
    : null;
  const altitudeState: number | 'ground' | null =
    altitudeFeet === null
      ? null
      : isLikelyGround(flight, altitudeFeet)
        ? 'ground'
        : altitudeFeet;

  let [h, s, l] = altitudeColor(altitudeState);

  if (selected) {
    h += COLOR_BY_ALT.selected.h;
    s += COLOR_BY_ALT.selected.s;
    l += COLOR_BY_ALT.selected.l;
  }

  h = normalizeHue(h);
  s = clamp(s, 0, 95);
  l = clamp(l, 0, 95);

  return `hsl(${formatNumber(h)}, ${formatNumber(s)}%, ${formatNumber(l)}%)`;
}

function resolveFlightIconPreset(flight: FlightRecord): IconPreset {
  const typeDesignator = normalizeToken(flight.aircraft_type);
  const category = null; // category codes not available in new schema; rely on text inference
  const combinedText = [
    typeDesignator,
    flight.description,
    flight.owner_operator,
    flight.callsign,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  if (typeDesignator && typeDesignator in TYPE_DESIGNATOR_ICONS) {
    return normalizeIconPreset(TYPE_DESIGNATOR_ICONS[typeDesignator]);
  }

  const inferredDesignator = inferTypeDesignator(combinedText);
  if (inferredDesignator && inferredDesignator in TYPE_DESIGNATOR_ICONS) {
    return normalizeIconPreset(TYPE_DESIGNATOR_ICONS[inferredDesignator]);
  }

  const inferredTypeDescription = inferTypeDescription(combinedText);
  if (inferredTypeDescription && inferredTypeDescription in TYPE_DESCRIPTION_ICONS) {
    return normalizeIconPreset(TYPE_DESCRIPTION_ICONS[inferredTypeDescription]);
  }

  if (category && category in CATEGORY_ICONS) {
    return normalizeIconPreset(CATEGORY_ICONS[category]);
  }

  return { shape: 'unknown', scale: 1 };
}

function normalizeIconPreset(value: readonly [FlightIconKey, number] | IconPreset): IconPreset {
  if (isIconTuple(value)) {
    return {
      shape: value[0],
      scale: value[1],
    };
  }

  return {
    shape: value.shape,
    scale: value.scale,
  };
}

function inferTypeDesignator(text: string): string | null {
  const directPatterns: Array<[RegExp, string]> = [
    [/\bA318\b/, 'A318'],
    [/\bA319\b|A319NEO|\bA19N\b/, 'A319'],
    [/\bA320\b|A320NEO|\bA20N\b/, 'A320'],
    [/\bA321\b|A321NEO|\bA21N\b/, 'A321'],
    [/\bA330\b|\bA332\b|\bA333\b|\bA338\b|\bA339\b/, 'A332'],
    [/\bA350\b|\bA359\b|\bA35K\b/, 'A359'],
    [/\bA380\b|\bA388\b/, 'A388'],
    [/\b737-800\b|\b737 800\b|\bB738\b|\bB38M\b/, 'B738'],
    [/\b737-900\b|\b737 900\b|\bB739\b|\bB39M\b|\bB3XM\b/, 'B739'],
    [/\b737-700\b|\b737 700\b|\bB737\b|\bB736\b|\bB735\b|\bB734\b|\bB733\b|\bB732\b|\bB731\b/, 'B737'],
    [/\b747\b|\bB744\b|\bB748\b/, 'B744'],
    [/\b777\b|\bB772\b|\bB773\b|\bB77L\b|\bB77W\b/, 'B772'],
    [/\b767\b|\bB763\b|\bB764\b/, 'B772'],
    [/\b787\b|\bB788\b|\bB789\b|\bB78X\b/, 'B772'],
    [/\bMD-11\b|\bMD11\b|\bDC-10\b|\bDC10\b/, 'MD11'],
    [/\bC-130\b|\bC130\b|\bC30J\b|\bHERCULES\b/, 'C130'],
    [/\bA400M\b|\bA400\b/, 'A400'],
    [/\bE170\b/, 'E170'],
    [/\bE175\b/, 'E75L'],
    [/\bE190\b/, 'E190'],
    [/\bE195\b/, 'E195'],
    [/\bA220-100\b|\bA220 100\b|\bBCS1\b/, 'BCS1'],
    [/\bA220-300\b|\bA220 300\b|\bBCS3\b/, 'BCS3'],
    [/\bCRJ100\b|\bCRJ1\b/, 'CRJ1'],
    [/\bCRJ200\b|\bCRJ2\b/, 'CRJ2'],
    [/\bCRJ700\b|\bCRJ7\b/, 'CRJ7'],
    [/\bCRJ900\b|\bCRJ9\b/, 'CRJ9'],
    [/\bBLACKHAWK\b|\bH60\b/, 'H60'],
    [/\bR22\b/, 'R22'],
    [/\bR44\b/, 'R44'],
    [/\bR66\b/, 'R66'],
  ];

  for (const [pattern, designator] of directPatterns) {
    if (pattern.test(text)) {
      return designator;
    }
  }

  return null;
}

function inferTypeDescription(text: string): string | null {
  if (/(HELICOPTER|ROTOR|BLACKHAWK)/.test(text)) {
    return 'H';
  }
  if (/(CESSNA|C172|C182|C206|C208)/.test(text)) {
    return 'L1P';
  }
  if (/(ATR|AT72|AT76|DH8|DASH|TURBOPROP|SAAB 340|SF34|SW4)/.test(text)) {
    return 'L2T';
  }
  if (/(BUSINESS JET|LEARJET|CITATION|FALCON|GULFSTREAM|CHALLENGER|GLOBAL|PRM1|HDJT|LJ)/.test(text)) {
    return 'L2J-L';
  }
  if (/(CRJ|EMBRAER|E170|E175|E190|E195|BCS1|BCS3|A220)/.test(text)) {
    return 'L2J-M';
  }
  if (/(747|777|787|767|A330|A350|A380|B772|B773|B77L|B77W|B788|B789|B78X|B763|B764)/.test(text)) {
    return 'L2J-H';
  }
  if (/(MD-11|MD11|DC-10|DC10)/.test(text)) {
    return 'L3J-H';
  }
  if (/(C130|C-130|C30J|HERCULES|A400|A400M)/.test(text)) {
    return 'L4T-H';
  }
  if (/(MILITARY|AIR FORCE|NAVY|ARMY|DEFENCE|DEFENSE|F16|F18|F35|RAFALE|EUROFIGHTER)/.test(text)) {
    return 'L1J';
  }
  return null;
}

function altitudeColor(altitude: number | 'ground' | null): [number, number, number] {
  let h: number;
  let s: number;
  let l: number;

  if (altitude === null) {
    h = COLOR_BY_ALT.unknown.h;
    s = COLOR_BY_ALT.unknown.s;
    l = COLOR_BY_ALT.unknown.l;
  } else if (altitude === 'ground') {
    h = COLOR_BY_ALT.ground.h;
    s = COLOR_BY_ALT.ground.s;
    l = COLOR_BY_ALT.ground.l;
  } else {
    const roundedAltitude = roundAltitudeForColor(altitude);
    h = interpolateAltitudeHue(roundedAltitude);
    s = COLOR_BY_ALT.air.s;
    l = interpolateHueLightness(h);
  }

  return [h, s, l];
}

function interpolateAltitudeHue(altitudeFeet: number) {
  const points = COLOR_BY_ALT.air.h;
  let value = points[0].val;

  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (altitudeFeet > points[index].alt) {
      if (index === points.length - 1) {
        value = points[index].val;
      } else {
        const start = points[index];
        const end = points[index + 1];
        value =
          start.val +
          ((end.val - start.val) * (altitudeFeet - start.alt)) / (end.alt - start.alt);
      }
      break;
    }
  }

  return value;
}

function interpolateHueLightness(hue: number) {
  const points = COLOR_BY_ALT.air.l;
  let value = points[0].val;

  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (hue > points[index].h) {
      if (index === points.length - 1) {
        value = points[index].val;
      } else {
        const start = points[index];
        const end = points[index + 1];
        value =
          start.val +
          ((end.val - start.val) * (hue - start.h)) / (end.h - start.h);
      }
      break;
    }
  }

  return value;
}

function roundAltitudeForColor(altitudeFeet: number) {
  const step = altitudeFeet < 8000 ? 50 : 200;
  return step * Math.round(altitudeFeet / step);
}




function isLikelyGround(flight: FlightRecord, altitudeFeet: number) {
  return altitudeFeet <= 150 && (flight.velocity_mps ?? 0) < 85;
}

function svgShapeToSVG(shape: TarShape, fillColor: string, strokeColor: string, strokeWidth: number, scale = 1) {
  const adjustedStrokeWidth = strokeWidth * (shape.strokeScale ?? 1);
  const width = shape.w * scale;
  const height = shape.h * scale;

  if (shape.svg) {
    return shape.svg
      .replace('fillColor', fillColor)
      .replaceAll('strokeColor', strokeColor)
      .replaceAll('strokeWidth', String(adjustedStrokeWidth))
      .replace('SIZE', `width="${width}px" height="${height}px"`);
  }

  let svg =
    `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="${shape.viewBox}" ` +
    `${shape.noAspect ? 'preserveAspectRatio="none" ' : ''}` +
    `width="${width}" height="${height}">` +
    `<g${shape.transform ? ` transform="${shape.transform}"` : ''}>`;

  const paths = Array.isArray(shape.path) ? shape.path : shape.path ? [shape.path] : [];
  for (const path of paths) {
    svg +=
      `<path paint-order="stroke" fill="${fillColor}" stroke="${strokeColor}" ` +
      `stroke-width="${2 * adjustedStrokeWidth}" d="${path}"/>`;
  }

  const accents = Array.isArray(shape.accent)
    ? shape.accent
    : shape.accent
      ? [shape.accent]
      : [];
  const accentWidth = 0.6 * ((shape.accentMult ?? 1) * strokeWidth);
  for (const accent of accents) {
    svg += `<path fill="none" stroke="${strokeColor}" stroke-width="${accentWidth}" d="${accent}"/>`;
  }

  svg += '</g></svg>';
  return svg;
}

function svgShapeToURI(shape: TarShape, fillColor: string, strokeColor: string, strokeWidth: number) {
  const svg = svgShapeToSVG(shape, fillColor, strokeColor, strokeWidth, 1);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function normalizeText(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHue(h: number) {
  if (h < 0) {
    return (h % 360) + 360;
  }
  if (h >= 360) {
    return h % 360;
  }
  return h;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number) {
  return Number(value.toFixed(1)).toString();
}
