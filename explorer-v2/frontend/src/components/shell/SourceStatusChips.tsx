import SourceBadge from '../cards/SourceBadge';

export default function SourceStatusChips() {
  return (
    <div className="source-chips">
      <SourceBadge label="ECMWF" detail="Weather Model" />
      <SourceBadge label="NOAA/VIIRS" detail="Satellite Source" />
    </div>
  );
}
