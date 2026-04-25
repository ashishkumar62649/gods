import type { ReactNode } from 'react';
import {
  useWeatherInspectStore,
  type PinnedPoint,
} from '../../core/store/useWeatherInspectStore';

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + hail',
  99: 'Thunderstorm + heavy hail',
};

function aqiColor(aqi: number | null): string {
  if (aqi === null) return '#475569';
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
}

function aqiLabel(aqi: number | null): string {
  if (aqi === null) return 'N/A';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy SG';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function shortDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function shortTime(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface CardProps {
  point: PinnedPoint;
}

export default function WeatherInspectorCard({ point }: CardProps) {
  const isExpanded = useWeatherInspectStore((s) => Boolean(s.expandedIds[point.id]));
  const toggleExpanded = useWeatherInspectStore((s) => s.toggleExpanded);
  const unpinPoint = useWeatherInspectStore((s) => s.unpinPoint);

  const { current, daily, airQuality } = point.data;
  const aqi = airQuality?.us_aqi ?? null;
  const ringColor = aqiColor(aqi);
  const label = aqiLabel(aqi);

  const RING_R = 34;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 213.628
  const aqiPercent = aqi !== null ? Math.min(aqi, 300) / 300 : 0;
  const ringFill = aqiPercent * RING_CIRCUMFERENCE;

  return (
    <div
      style={{
        background: 'rgba(8, 15, 30, 0.92)',
        border: '1px solid rgba(34, 211, 238, 0.35)',
        borderRadius: '0.875rem',
        padding: '0.75rem 0.875rem',
        marginBottom: '0.5rem',
        color: '#e2e8f0',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
        fontSize: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.5rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: 0.55,
            }}
          >
            {WMO_DESCRIPTIONS[current.weather_code] ?? '—'}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              opacity: 0.75,
              marginTop: '0.15rem',
            }}
          >
            {point.lat.toFixed(2)}°, {point.lon.toFixed(2)}°
          </div>
        </div>
        <button
          type="button"
          onClick={() => unpinPoint(point.id)}
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: '0.65rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '0.4rem',
            lineHeight: 1,
          }}
          aria-label="Close card"
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ position: 'relative', width: '5.5rem', height: '5.5rem', flexShrink: 0 }}>
          <svg
            width="88"
            height="88"
            viewBox="0 0 88 88"
            style={{ position: 'absolute', inset: 0 }}
          >
            <circle
              cx="44"
              cy="44"
              r={RING_R}
              fill="none"
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth="6"
            />
            <circle
              cx="44"
              cy="44"
              r={RING_R}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeDasharray={`${ringFill} ${RING_CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: 'monospace' }}>
              {Math.round(current.temperature_2m)}°
            </span>
            <span style={{ fontSize: '0.55rem', opacity: 0.6, marginTop: '-2px' }}>
              feels {Math.round(current.apparent_temperature)}°
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <DataRow
            label="Wind"
            value={`${current.wind_speed_10m.toFixed(1)} m/s · ${Math.round(current.wind_direction_10m)}°`}
          />
          <DataRow
            label="Gust"
            value={
              current.wind_gusts_10m != null
                ? `${current.wind_gusts_10m.toFixed(1)} m/s`
                : '—'
            }
          />
          <DataRow label="AQI" value={label} valueColor={ringColor} />
          <DataRow label="Cloud" value={`${current.cloud_cover}%`} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.25rem',
          marginTop: '0.625rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      >
        {daily.time.map((isoDate, idx) => (
          <div
            key={isoDate}
            style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', minWidth: 0 }}
          >
            <div
              style={{
                opacity: 0.6,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {shortDay(isoDate)}
            </div>
            <div
              style={{
                fontSize: '0.55rem',
                opacity: 0.5,
                margin: '2px 0',
                minHeight: '1.6em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {(WMO_DESCRIPTIONS[daily.weather_code[idx]] ?? '').slice(0, 8)}
            </div>
            <div style={{ fontFamily: 'monospace' }}>
              <span style={{ color: '#fca5a5' }}>
                {Math.round(daily.temperature_2m_max[idx])}°
              </span>
              <span style={{ opacity: 0.4 }}> / </span>
              <span style={{ color: '#7dd3fc' }}>
                {Math.round(daily.temperature_2m_min[idx])}°
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => toggleExpanded(point.id)}
        style={{
          width: '100%',
          marginTop: '0.5rem',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(34, 211, 238, 0.25)',
          color: '#67e8f9',
          padding: '0.3rem',
          borderRadius: '0.4rem',
          cursor: 'pointer',
          fontSize: '0.62rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        {isExpanded ? '▲ Less' : '▼ More Detail'}
      </button>

      {isExpanded && (
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          <SectionLabel>Atmosphere</SectionLabel>
          <DataRow label="Humidity" value={`${current.relative_humidity_2m}%`} />
          <DataRow
            label="Pressure"
            value={
              current.surface_pressure != null
                ? `${current.surface_pressure.toFixed(0)} hPa`
                : '—'
            }
          />
          <DataRow
            label="Visibility"
            value={
              current.visibility != null
                ? `${(current.visibility / 1000).toFixed(1)} km`
                : '—'
            }
          />

          <SectionLabel>Air Quality</SectionLabel>
          {airQuality ? (
            <>
              <DataRow
                label="PM2.5"
                value={
                  airQuality.pm2_5 != null ? `${airQuality.pm2_5.toFixed(1)} µg/m³` : '—'
                }
              />
              <DataRow
                label="PM10"
                value={
                  airQuality.pm10 != null ? `${airQuality.pm10.toFixed(1)} µg/m³` : '—'
                }
              />
              <DataRow
                label="Ozone"
                value={
                  airQuality.ozone != null ? `${airQuality.ozone.toFixed(0)} µg/m³` : '—'
                }
              />
              <DataRow
                label="NO₂"
                value={
                  airQuality.nitrogen_dioxide != null
                    ? `${airQuality.nitrogen_dioxide.toFixed(0)} µg/m³`
                    : '—'
                }
              />
              <DataRow
                label="SO₂"
                value={
                  airQuality.sulphur_dioxide != null
                    ? `${airQuality.sulphur_dioxide.toFixed(0)} µg/m³`
                    : '—'
                }
              />
              <DataRow
                label="UV Index"
                value={airQuality.uv_index != null ? airQuality.uv_index.toFixed(1) : '—'}
              />
            </>
          ) : (
            <div style={{ opacity: 0.5, fontSize: '0.65rem' }}>Air quality unavailable.</div>
          )}

          <SectionLabel>Sun</SectionLabel>
          <DataRow label="Sunrise" value={shortTime(daily.sunrise[0])} />
          <DataRow label="Sunset" value={shortTime(daily.sunset[0])} />
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: valueColor }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: '0.55rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        opacity: 0.5,
        margin: '0.5rem 0 0.3rem',
      }}
    >
      {children}
    </div>
  );
}
