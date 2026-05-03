import { useUiStore } from '../../store/uiStore';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'events', label: 'Events' },
  { id: 'watch-zones', label: 'Watch Zones' },
  { id: 'assets', label: 'Assets' },
  { id: 'timeline', label: 'Timeline' },
];

interface BottomModeTabsProps {
  active?: string;
}

export default function BottomModeTabs({ active }: BottomModeTabsProps) {
  const activeBottomTab = useUiStore((state) => state.activeBottomTab);
  const setActiveBottomTab = useUiStore((state) => state.setActiveBottomTab);
  const current = active ?? activeBottomTab;

  return (
    <div className="bottom-mode-tabs god-glass">
      {tabs.map((tab) => (
        <button
          className={tab.id === current ? 'is-active' : ''}
          key={tab.id}
          type="button"
          onClick={() => setActiveBottomTab(tab.id)}
        >
          {tab.label}
          {tab.id === 'watch-zones' ? <span>7</span> : null}
        </button>
      ))}
    </div>
  );
}
