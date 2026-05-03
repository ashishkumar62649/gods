import type { ReactNode } from 'react';

interface IntelligenceCardProps {
  title: string;
  children: ReactNode;
}

export default function IntelligenceCard({ title, children }: IntelligenceCardProps) {
  return (
    <article className="intelligence-card">
      <p className="god-kicker">{title}</p>
      {children}
    </article>
  );
}
