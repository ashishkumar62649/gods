import type { ReactNode } from 'react';
import { severityClass } from '../../utils/severity';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: string;
}

export default function StatusBadge({ children, tone = 'muted' }: StatusBadgeProps) {
  return <span className={`status-badge ${severityClass(tone)}`}>{children}</span>;
}
