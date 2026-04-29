import { useEffect, useRef } from 'react';
import { initializeViewer } from '../../engine/ViewerRuntime';
import GlobalLayerPanel from '../panels/GlobalLayerPanel';
import EmergencyTicker from '../panels/EmergencyTicker';
import SearchPanel from '../panels/SearchPanel';
import SatelliteHud from '../panels/SatelliteHud';
import TelemetryHud from '../panels/TelemetryHud';
import WeatherInspectorOverlay from '../panels/WeatherInspectorOverlay';

export default function EarthDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const { destroy } = initializeViewer(containerRef.current);
    return destroy;
  }, []);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />
      <div
        className="ui-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        <SearchPanel />
        <GlobalLayerPanel />
        <EmergencyTicker />
        <SatelliteHud />
        <TelemetryHud />
        <WeatherInspectorOverlay />
      </div>
    </main>
  );
}
