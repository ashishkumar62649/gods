import { pct } from '../../utils/formatters';

interface ConfidenceBarProps {
  value: number;
  label?: string;
}

export default function ConfidenceBar({ value, label = 'Confidence' }: ConfidenceBarProps) {
  return (
    <div className="confidence-bar">
      <span>{label} {pct(value)}</span>
      <div className="confidence-bar__track">
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
