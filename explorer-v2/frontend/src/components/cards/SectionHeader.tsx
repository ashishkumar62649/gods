import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <p className="god-kicker">{title}</p>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
