import type { MockMapEntity } from '../../earth/mockMapEntities';
import MapMarker from './MapMarker';

export default function AircraftMarker({ entity }: { entity: MockMapEntity }) {
  return <MapMarker entity={entity} />;
}
