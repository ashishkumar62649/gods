import type { MockMapEntity } from '../../earth/mockMapEntities';
import { severityClass } from '../../utils/severity';

interface MapMarkerProps {
  entity: MockMapEntity;
}

export default function MapMarker({ entity }: MapMarkerProps) {
  return (
    <div
      className={`map-marker map-marker--${entity.type} ${severityClass(entity.severity)}`}
      style={{ left: `${entity.x}%`, top: `${entity.y}%` }}
    >
      <i />
      <span>{entity.label}</span>
    </div>
  );
}
