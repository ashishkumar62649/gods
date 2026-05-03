import type { ReactNode } from 'react';

export default function RightIntelligencePanel({ children }: { children: ReactNode }) {
  return <aside className="god-right-panel god-glass">{children}</aside>;
}
