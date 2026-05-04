import { useUiStore } from '../../store/uiStore';
import { useLiveDataStore } from '../../store/liveDataStore';
import { useMapStore } from '../../core/store/useMapStore';
import { useTimelineStore } from '../../store/timelineStore';

export default function StatusFooter() {
  const mode = useUiStore((state) => state.mode);
  const selectedLocationLat = useLiveDataStore((state) => state.selectedLocationLat);
  const selectedLocationLon = useLiveDataStore((state) => state.selectedLocationLon);
  const selectedLocationElevationM = useLiveDataStore((state) => state.selectedLocationElevationM);
  const cameraLat = useMapStore((state) => state.cameraLat);
  const cameraLon = useMapStore((state) => state.cameraLon);
  const cameraHeightM = useMapStore((state) => state.cameraHeightM);
  const timelineMode = useTimelineStore((state) => state.mode);
  const liveCoordinates =
    cameraLat !== null && cameraLon !== null
      ? `${Math.abs(cameraLat).toFixed(2)} deg ${cameraLat >= 0 ? 'N' : 'S'}, ${Math.abs(cameraLon).toFixed(2)} deg ${cameraLon >= 0 ? 'E' : 'W'}`
      : mode === 'location-intelligence'
      ? `${Math.abs(selectedLocationLat).toFixed(2)} deg ${selectedLocationLat >= 0 ? 'N' : 'S'}, ${Math.abs(selectedLocationLon).toFixed(2)} deg ${selectedLocationLon >= 0 ? 'E' : 'W'}`
      : 'Camera pending';

  return (
    <footer className="status-footer">
      <div>
        <span>COORDINATES</span>
        <b>{liveCoordinates}</b>
      </div>
      <div>
        <span>ELEVATION</span>
        <b>{cameraHeightM > 0 ? `${cameraHeightM.toLocaleString('en-US')} m` : `${selectedLocationElevationM} m`}</b>
      </div>
      <div>
        <span>TIME MODE</span>
        <b>{timelineMode}</b>
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
