import type { ReactNode } from 'react';
import { useUiStore } from '../../store/uiStore';

export default function LeftControlPanel({ children }: { children: ReactNode }) {
  const collapsed = useUiStore((state) => state.leftPanelCollapsed);

  return (
    <aside className={`god-left-panel god-glass ${collapsed ? 'is-collapsed' : ''}`}>
      {children}
    </aside>
  );
}
