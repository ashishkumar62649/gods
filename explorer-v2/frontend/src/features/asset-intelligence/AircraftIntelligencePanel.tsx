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
  const setRightPanelOpen = useUiStore((state) => state.setRightPanelOpen);
  const [flight, setFlight] = useState<FlightRecord | null>(null);
  const [route, setRoute] = useState<FlightRouteSnapshot | null>(null);
  const [status, setStatus] = useState<PanelState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [selectedAssetId]);

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
