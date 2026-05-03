import { useUiStore } from '../../store/uiStore';
import { useLiveDataStore } from '../../store/liveDataStore';

const coordsByMode = {
  'world-overview': '11 deg 01 min N, 88 deg 01 min E',
  'asset-intelligence': '25 deg 37 min N, 82 deg 58 min E',
  'watch-zones': '18 deg 57 min N, 88 deg 36 min E',
  'location-intelligence': '22 deg 34 min N, 88 deg 21 min E',
};

export default function StatusFooter() {
  const mode = useUiStore((state) => state.mode);
  const selectedLocationLat = useLiveDataStore((state) => state.selectedLocationLat);
  const selectedLocationLon = useLiveDataStore((state) => state.selectedLocationLon);
  const selectedLocationElevationM = useLiveDataStore((state) => state.selectedLocationElevationM);
  const feedCycle = useLiveDataStore((state) => state.feedCycle);
  const liveCoordinates =
    mode === 'location-intelligence'
      ? `${Math.abs(selectedLocationLat).toFixed(2)} deg ${selectedLocationLat >= 0 ? 'N' : 'S'}, ${Math.abs(selectedLocationLon).toFixed(2)} deg ${selectedLocationLon >= 0 ? 'E' : 'W'}`
      : coordsByMode[mode];

  return (
    <footer className="status-footer">
      <div>
        <span>COORDINATES</span>
        <b>{liveCoordinates}</b>
      </div>
      <div>
        <span>ELEVATION</span>
        <b>{mode === 'location-intelligence' ? `${selectedLocationElevationM} m` : `${10 + (feedCycle % 6)} m`}</b>
      </div>
      <div>
        <span>SCALE</span>
        <b>1 : 9,500,000</b>
      </div>
      <p>Copyright 2026 GODS Explorer</p>
      <a>Open Source Project</a>
      <nav>
        <a>Docs</a>
        <a>API</a>
        <a>GitHub</a>
        <b className="health-dot">All Systems Operational</b>
      </nav>
    </footer>
  );
}
