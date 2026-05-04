import type { ReactNode } from 'react';
import { useUiStore } from '../../store/uiStore';

export default function RightIntelligencePanel({ children }: { children: ReactNode }) {
  const open = useUiStore((state) => state.rightPanelOpen);
  if (!open) return null;
  return <aside className="god-right-panel god-glass">{children}</aside>;
}
