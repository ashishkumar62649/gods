import type { ReactNode } from 'react';
import SectionHeader from './SectionHeader';

interface GlassPanelProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export default function GlassPanel({
  title,
  subtitle,
  children,
  className = '',
  actions,
}: GlassPanelProps) {
  return (
    <section className={`god-glass glass-panel ${className}`}>
      {title ? <SectionHeader title={title} subtitle={subtitle} right={actions} /> : null}
      {children}
    </section>
  );
}
