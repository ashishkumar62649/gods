import type { ReactNode } from 'react';

export default function LeftControlPanel({ children }: { children: ReactNode }) {
  return <aside className="god-left-panel god-glass">{children}</aside>;
}
