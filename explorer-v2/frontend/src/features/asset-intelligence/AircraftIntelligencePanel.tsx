import { useEffect, useMemo, useState } from 'react';
import MiniMetricCard from '../../components/cards/MiniMetricCard';
import RiskScoreRing from '../../components/cards/RiskScoreRing';
import StatusBadge from '../../components/cards/StatusBadge';
import RightIntelligencePanel from '../../components/shell/RightIntelligencePanel';
import {
  fetchFlightRoute,
  fetchFlightSnapshot,
  formatAltitudeMeters,
  formatHeading,
  formatLastUpdated,
  formatSpeed,
  type FlightRecord,
  type FlightRouteSnapshot,
} from '../../earth/flights/flights';
import { useSelectionStore } from '../../store/selectionStore';
import { useUiStore } from '../../store/uiStore';
import RouteOverviewCard from './RouteOverviewCard';
import SourceProvenanceCard from './SourceProvenanceCard';
import WeatherAlongRouteCard from './WeatherAlongRouteCard';
import WhatToWatchCard from './WhatToWatchCard';

type PanelState = 'loading' | 'live' | 'empty' | 'error';

export default function AircraftIntelligencePanel() {
  const selectedAssetId = useSelectionStore((state) => state.selectedAssetId);
  const selectedAssetDomain = useSelectionStore((state) => state.selectedAssetDomain);
  const selectedAssetRecord = useSelectionStore((state) => state.selectedAssetRecord);
  const setRightPanelOpen = useUiStore((state) => state.setRightPanelOpen);
  const [flight, setFlight] = useState<FlightRecord | null>(null);
  const [route, setRoute] = useState<FlightRouteSnapshot | null>(null);
  const [status, setStatus] = useState<PanelState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAssetDomain && selectedAssetDomain !== 'aviation') {
      setFlight(null);
      setRoute(null);
      setStatus('live');
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    setError(null);

    async function load() {
      try {
        const snapshot = await fetchFlightSnapshot(controller.signal);
        const selected = snapshot.flights.find((item) =>
          [item.id_icao, item.callsign, item.registration]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase() === selectedAssetId?.toLowerCase()),
        ) ?? snapshot.flights[0] ?? null;

        if (!selected) {
          setFlight(null);
          setRoute(null);
          setStatus('empty');
          return;
        }

        setFlight(selected);
        setStatus('live');

        const callsign = selected.callsign?.trim();
        if (callsign) {
          fetchFlightRoute(callsign, controller.signal)
            .then(setRoute)
            .catch(() => setRoute(null));
        } else {
          setRoute(null);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setFlight(null);
        setRoute(null);
        setStatus('error');
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    }

    void load();
    return () => controller.abort();
  }, [selectedAssetId, selectedAssetDomain]);

  if (selectedAssetDomain && selectedAssetDomain !== 'aviation' && selectedAssetRecord) {
    return (
      <SelectedAssetInfoPanel
        domain={selectedAssetDomain}
        record={selectedAssetRecord}
        onClose={() => setRightPanelOpen(false)}
      />
    );
  }

  const metrics = useMemo(() => {
    if (!flight) return [];
    return [
      { label: 'Altitude', value: formatAltitudeMeters(flight.altitude_baro_m) },
      { label: 'Speed', value: formatSpeed(flight.velocity_mps) },
      { label: 'Heading', value: formatHeading(flight.heading_true_deg) },
      { label: 'Registration', value: flight.registration ?? 'Unknown' },
      { label: 'Owner / Operator', value: flight.owner_operator ?? 'Unknown' },
      { label: 'Coordinates', value: `${flight.latitude.toFixed(2)}, ${flight.longitude.toFixed(2)}` },
      { label: 'Updated', value: formatLastUpdated(flight.timestamp) },
    ];
  }, [flight]);

  const badges = useMemo(() => {
    if (!flight) return [];
    return [
      flight.is_active_emergency ? 'Emergency' : null,
      flight.is_military ? 'Military' : null,
      flight.is_interesting ? 'Watch' : null,
      flight.is_pia ? 'PIA' : null,
      flight.is_ladd ? 'LADD' : null,
    ].filter(Boolean) as string[];
  }, [flight]);

  const watchNotes = useMemo(() => {
    if (!flight) return ['Waiting for a live aircraft selection.'];
    const notes = [];
    if (flight.is_active_emergency) notes.push('Emergency squawk or active emergency flag is present.');
    if (flight.is_military) notes.push('Military/intelligence feed classified this aircraft as military.');
    if (flight.is_interesting) notes.push('ADS-B intelligence feed marked this aircraft as interesting.');
    if (route?.found) notes.push('Route lookup resolved origin or destination context.');
    if (notes.length === 0) notes.push('No active anomaly flags on the latest aircraft snapshot.');
    return notes;
  }, [flight, route]);

  const sources = useMemo(() => {
    if (!flight) return [{ label: 'Live flight feed', status: status }];
    return [
      { label: flight.data_source || 'Live flight feed', status: 'position' },
      { label: route?.source ?? 'OpenSky route', status: route?.found ? 'resolved' : 'unavailable' },
    ];
  }, [flight, route, status]);

  const weatherLegs = useMemo(() => {
    if (!flight) {
      return [{ leg: 'Aircraft', altitude: 'No track', temp: 'N/A', condition: 'No selected flight' }];
    }
    return [{
      leg: flight.callsign?.trim() || flight.id_icao,
      altitude: formatAltitudeMeters(flight.altitude_baro_m),
      temp: 'DB query',
      condition: 'Weather layer uses /api/v2/weather/current near the live position',
    }];
  }, [flight]);

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll aircraft-panel">
        <header className="panel-title-row">
          <div>
            <h2>Aircraft Intelligence</h2>
            <strong>{flight?.callsign?.trim() || flight?.id_icao || 'No live aircraft selected'}</strong>
            <span>{flight?.description ?? flight?.aircraft_type ?? statusLabel(status)}</span>
            <small>{error ?? (flight ? `Telemetry updated ${formatLastUpdated(flight.timestamp)}` : 'Waiting for backend feed')}</small>
          </div>
          <button type="button" onClick={() => setRightPanelOpen(false)}>Close</button>
        </header>
        <div className="badge-row">
          <StatusBadge tone={status === 'live' ? 'active' : status}>{statusLabel(status)}</StatusBadge>
          {badges.map((badge) => <StatusBadge tone={badge.toLowerCase()} key={badge}>{badge}</StatusBadge>)}
        </div>
        <div className="mini-grid">
          {metrics.length > 0
            ? metrics.map((metric) => <MiniMetricCard key={metric.label} {...metric} />)
            : <MiniMetricCard label="Live feed" value={statusLabel(status)} />}
        </div>
        <RouteOverviewCard route={route} />
        <WeatherAlongRouteCard legs={weatherLegs} />
        <div className="anomaly-card">
          <RiskScoreRing score={riskScoreForFlight(flight)} label={riskLabelForFlight(flight)} />
          <div className="sparkline" />
          <strong>{flight?.is_active_emergency ? '+ emergency' : flight?.is_interesting ? '+ watch' : 'stable'}</strong>
        </div>
        <SourceProvenanceCard sources={sources} />
        <WhatToWatchCard notes={watchNotes} />
      </div>
    </RightIntelligencePanel>
  );
}

function SelectedAssetInfoPanel({
  domain,
  record,
  onClose,
}: {
  domain: string;
  record: Record<string, unknown>;
  onClose: () => void;
}) {
  const title = String(
    record.name ??
      record.object_name ??
      record.title ??
      record.vessel_id ??
      record.id_norad ??
      record.asset_id ??
      'Selected asset',
  );
  const subtitle = domainLabel(domain);
  const timestamp = Number(record.timestamp);
  const updated = Number.isFinite(timestamp)
    ? formatLastUpdated(timestamp)
    : String(record.observed_time ?? record.time_index ?? 'live');
  const metrics = [
    metric('Latitude', numberValue(record.latitude ?? record.lat, 3)),
    metric('Longitude', numberValue(record.longitude ?? record.lon, 3)),
    metric('Speed', vesselSpeed(record.speed_knots) ?? satelliteSpeed(record.velocity_kps) ?? 'N/A'),
    metric('Heading', numberValue(record.heading_deg, 0, 'deg')),
    metric('Altitude', satelliteAltitude(record.altitude_km)),
    metric('Risk', String(record.risk_status ?? 'Normal')),
    metric('Nearest cable', distanceValue(record.nearest_cable_distance_m)),
    metric('Source', String(record.data_source ?? 'live/database')),
  ].filter((item) => item.value !== 'N/A');
  const notes = notesForDomain(domain, record);

  return (
    <RightIntelligencePanel>
      <div className="god-panel-scroll aircraft-panel">
        <header className="panel-title-row">
          <div>
            <h2>{subtitle}</h2>
            <strong>{title}</strong>
            <span>{String(record.vessel_type ?? record.parameter_id ?? record.event_type ?? 'Live entity')}</span>
            <small>Telemetry updated {updated}</small>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </header>
        <div className="badge-row">
          <StatusBadge tone="active">Live</StatusBadge>
          <StatusBadge tone={String(record.risk_status ?? '').toLowerCase() === 'risk' ? 'high' : 'normal'}>
            {String(record.risk_status ?? domain)}
          </StatusBadge>
        </div>
        <div className="mini-grid">
          {metrics.map((item) => <MiniMetricCard key={item.label} {...item} />)}
        </div>
        <div className="anomaly-card">
          <RiskScoreRing score={riskScoreForRecord(record)} label={riskLabelForRecord(record)} />
          <div className="sparkline" />
          <strong>{String(record.risk_status ?? '').toLowerCase() === 'risk' ? '+ cable risk' : 'stable'}</strong>
        </div>
        <SourceProvenanceCard sources={[{ label: String(record.data_source ?? 'God Eyes database'), status: 'position' }]} />
        <WhatToWatchCard notes={notes} />
      </div>
    </RightIntelligencePanel>
  );
}

function metric(label: string, value: string) {
  return { label, value };
}

function domainLabel(domain: string) {
  if (domain === 'maritime') return 'Maritime Intelligence';
  if (domain === 'satellite') return 'Satellite Intelligence';
  if (domain === 'infrastructure') return 'Infrastructure Intelligence';
  return 'Asset Intelligence';
}

function numberValue(value: unknown, digits = 1, suffix = '') {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  return `${number.toFixed(digits)}${suffix ? ` ${suffix}` : ''}`;
}

function vesselSpeed(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)} kt` : null;
}

function satelliteSpeed(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} km/s` : null;
}

function satelliteAltitude(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toLocaleString('en-US', { maximumFractionDigits: 0 })} km` : 'N/A';
}

function distanceValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'N/A';
  if (number >= 1000) return `${(number / 1000).toFixed(1)} km`;
  return `${number.toFixed(0)} m`;
}

function notesForDomain(domain: string, record: Record<string, unknown>) {
  if (domain === 'maritime') {
    const notes = ['AIS traffic is rendered on the ocean surface and persisted to maritime.position_snapshots.'];
    if (String(record.risk_status ?? '').toUpperCase() === 'RISK') {
      notes.push('This vessel is close enough to an internet cable to trigger the cable-risk visual mode.');
    }
    notes.push('Cable-risk mode keeps vessel trails visible without turning the globe into clutter.');
    return notes;
  }
  if (domain === 'satellite') {
    return [
      'Satellite position is rendered at propagated orbital altitude.',
      'Orbit-trail and sensor-focus modes are controlled from the asset layer panel.',
    ];
  }
  return ['Selected infrastructure entity is clamped to the surface and linked to the database-backed layer.'];
}

function riskScoreForRecord(record: Record<string, unknown>) {
  if (String(record.risk_status ?? '').toUpperCase() === 'RISK') return 78;
  if (Number(record.nearest_cable_distance_m) <= 10_000) return 64;
  return 28;
}

function riskLabelForRecord(record: Record<string, unknown>) {
  const score = riskScoreForRecord(record);
  if (score >= 75) return 'High';
  if (score >= 45) return 'Elevated';
  return 'Normal';
}

function statusLabel(status: PanelState) {
  switch (status) {
    case 'loading':
      return 'Loading';
    case 'live':
      return 'Live';
    case 'empty':
      return 'No flights';
    case 'error':
      return 'Backend offline';
    default:
      return status;
  }
}

function riskScoreForFlight(flight: FlightRecord | null) {
  if (!flight) return 0;
  let score = 20;
  if (flight.is_active_emergency) score += 55;
  if (flight.is_military) score += 16;
  if (flight.is_interesting) score += 14;
  if (flight.is_pia || flight.is_ladd) score += 6;
  return Math.min(98, score);
}

function riskLabelForFlight(flight: FlightRecord | null) {
  const score = riskScoreForFlight(flight);
  if (score >= 75) return 'High';
  if (score >= 45) return 'Elevated';
  if (score > 0) return 'Normal';
  return 'No data';
}
