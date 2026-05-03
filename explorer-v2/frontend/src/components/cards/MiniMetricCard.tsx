interface MiniMetricCardProps {
  label: string;
  value: string | number;
}

export default function MiniMetricCard({ label, value }: MiniMetricCardProps) {
  return (
    <div className="mini-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
