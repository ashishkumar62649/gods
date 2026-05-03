import type { ReactNode } from 'react';
import type { Severity } from '../../app/appTypes';
import ConfidenceBar from './ConfidenceBar';
import StatusBadge from './StatusBadge';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  severity?: Severity;
  confidence?: number;
  description?: string;
}

export default function MetricCard({
  icon,
  label,
  value,
  severity = 'healthy',
  confidence,
  description,
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__top">
        <span className="metric-card__icon">{icon}</span>
        <div>
          <span className="metric-card__label">{label}</span>
          <strong>{value}</strong>
        </div>
        <StatusBadge tone={severity}>{severity}</StatusBadge>
      </div>
      {description ? <p>{description}</p> : null}
      {typeof confidence === 'number' ? <ConfidenceBar value={confidence} /> : null}
    </article>
  );
}
