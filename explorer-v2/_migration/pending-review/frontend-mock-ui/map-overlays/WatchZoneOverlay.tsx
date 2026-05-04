import type { MockMapEntity } from '../../earth/mockMapEntities';
import { severityClass } from '../../utils/severity';

export default function WatchZoneOverlay({ entity }: { entity: MockMapEntity }) {
  return (
    <div
      className={`watch-zone-overlay ${severityClass(entity.severity)}`}
      style={{ left: `${entity.x - 5}%`, top: `${entity.y - 5}%` }}
    >
      <span>{entity.label}</span>
    </div>
  );
}
