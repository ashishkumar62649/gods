interface SourceBadgeProps {
  label: string;
  detail: string;
}

export default function SourceBadge({ label, detail }: SourceBadgeProps) {
  return (
    <span className="source-badge">
      <i />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </span>
  );
}
