import { useUiStore } from '../../store/uiStore';
import { mockMapEntities } from '../../earth/mockMapEntities';
import { useLiveDataStore } from '../../store/liveDataStore';
import { moveOverlayEntities } from '../../utils/liveData';
import AircraftMarker from './AircraftMarker';
import EarthquakeMarker from './EarthquakeMarker';
import FireMarker from './FireMarker';
import MapMarker from './MapMarker';
import RouteLineOverlay from './RouteLineOverlay';
import StormMarker from './StormMarker';
import WatchZoneOverlay from './WatchZoneOverlay';

export default function MapOverlayLayer() {
  const mode = useUiStore((state) => state.mode);
  const nowMs = useLiveDataStore((state) => state.nowMs);
  const entities = moveOverlayEntities(
    mockMapEntities.filter((entity) => entity.mode === mode),
    nowMs,
  );

  return (
    <div className="mock-map-overlay">
      {mode === 'asset-intelligence' ? <RouteLineOverlay /> : null}
      {entities.map((entity) => {
        if (entity.type === 'aircraft') return <AircraftMarker entity={entity} key={entity.id} />;
        if (entity.type === 'storm') return <StormMarker entity={entity} key={entity.id} />;
        if (entity.type === 'fire') return <FireMarker entity={entity} key={entity.id} />;
        if (entity.type === 'earthquake') return <EarthquakeMarker entity={entity} key={entity.id} />;
        if (entity.type === 'watch-zone' || entity.type === 'corridor') {
          return <WatchZoneOverlay entity={entity} key={entity.id} />;
        }
        return <MapMarker entity={entity} key={entity.id} />;
      })}
    </div>
  );
}
