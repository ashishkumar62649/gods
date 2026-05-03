import type { MockMapEntity } from '../../earth/mockMapEntities';
import MapMarker from './MapMarker';

export default function FireMarker({ entity }: { entity: MockMapEntity }) {
  return <MapMarker entity={entity} />;
}
