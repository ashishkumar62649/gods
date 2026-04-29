import { useMemo } from 'react';
import { useMapStore } from '../../core/store/useMapStore';
import {
  type EmergencyFlightData,
  useTelemetryStore,
} from '../../core/store/useTelemetryStore';

const SQUAWK_LABELS: Record<string, string> = {
  '7700': 'General Emergency',
  '7600': 'Radio Failure',
  '7500': 'Hijack',
};

export default function EmergencyTicker() {
  const emergencies = useTelemetryStore((state) => state.activeEmergencies);
  const setFlightsVisible = useTelemetryStore((state) => state.setFlightsVisible);
  const setSelectedEntity = useTelemetryStore((state) => state.setSelectedEntity);
  const setSensorLink = useTelemetryStore((state) => state.setSensorLink);
  const requestFlyToCoordinates = useMapStore((state) => state.requestFlyToCoordinates);

  const sortedEmergencies = useMemo(
    () =>
      Object.values(emergencies).sort((a, b) => {
        if (a.emergencyStatus !== b.emergencyStatus) {
          return a.emergencyStatus === 'ACTIVE' ? -1 : 1;
        }
        return b.lastSeenAt.localeCompare(a.lastSeenAt);
      }),
    [emergencies],
  );

  if (sortedEmergencies.length === 0) {
    return null;
  }

  const latest = sortedEmergencies[0];

  const handleEmergencyClick = (emergency: EmergencyFlightData) => {
    setFlightsVisible(true);
    setSelectedEntity(emergency.id, 'flight');
    setSensorLink('focus');

    if (emergency.emergencyStatus === 'SIGNAL_LOST') {
      requestFlyToCoordinates(emergency.lat, emergency.lon, 45_000);
    }
  };

  return (
    <aside
      aria-label="Emergency squawk alerts"
      style={{
        position: 'absolute',
        top: '5.6rem',
        right: '1rem',
        zIndex: 24,
        width: 'min(28rem, calc(100vw - 2rem))',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <button
        type="button"
        onClick={() => handleEmergencyClick(latest)}
        style={{
          width: '100%',
          border: '1px solid rgba(248, 113, 113, 0.72)',
          background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.92), rgba(15, 23, 42, 0.88))',
          color: '#fff7ed',
          boxShadow: '0 18px 48px rgba(127, 29, 29, 0.42)',
          borderRadius: 8,
          padding: '0.75rem 0.9rem',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#fde68a' }}>
          Emergency Squawk
        </div>
        <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800 }}>
          {formatEmergencyMessage(latest)}
        </div>
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          maxHeight: '12rem',
          overflowY: 'auto',
        }}
      >
        {sortedEmergencies.slice(0, 5).map((emergency) => (
          <button
            key={emergency.id}
            type="button"
            onClick={() => handleEmergencyClick(emergency)}
            style={{
              border: '1px solid rgba(248, 113, 113, 0.28)',
              background: emergency.emergencyStatus === 'ACTIVE'
                ? 'rgba(69, 10, 10, 0.76)'
                : 'rgba(15, 23, 42, 0.78)',
              color: '#fee2e2',
              borderRadius: 8,
              padding: '0.5rem 0.7rem',
              textAlign: 'left',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {formatEmergencyTitle(emergency)}
            </div>
            <div style={{ marginTop: 2, fontSize: 11, color: 'rgba(254, 226, 226, 0.72)' }}>
              {formatEmergencyMeta(emergency)}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function formatEmergencyMessage(emergency: EmergencyFlightData) {
  if (emergency.emergencyStatus === 'SIGNAL_LOST') {
    return `ALERT (SIGNAL LOST): ${emergency.squawk ?? '----'} last seen near ${emergency.regionLabel} ${formatAge(emergency.lastSeenAt)} ago.`;
  }

  return `ALERT: ${getAircraftLabel(emergency)} squawking ${emergency.squawk ?? '----'} near ${emergency.regionLabel}.`;
}

function formatEmergencyTitle(emergency: EmergencyFlightData) {
  const squawk = emergency.squawk ?? '----';
  const label = SQUAWK_LABELS[squawk] ?? 'Emergency';
  return `${squawk} - ${label}`;
}

function formatEmergencyMeta(emergency: EmergencyFlightData) {
  const name = getAircraftLabel(emergency);
  const status = emergency.emergencyStatus === 'SIGNAL_LOST'
    ? `signal lost ${formatAge(emergency.lastSeenAt)} ago`
    : 'active';
  return `${name} near ${emergency.regionLabel} - ${status}`;
}

function getAircraftLabel(emergency: EmergencyFlightData) {
  return (
    emergency.aircraftType ||
    emergency.description ||
    emergency.callsign ||
    emergency.registration ||
    'Aircraft'
  );
}

function formatAge(isoDate: string) {
  const ageMs = Math.max(0, Date.now() - Date.parse(isoDate));
  const ageMinutes = Math.floor(ageMs / 60_000);
  if (ageMinutes < 1) return 'just now';
  if (ageMinutes === 1) return '1 min';
  return `${ageMinutes} mins`;
}
