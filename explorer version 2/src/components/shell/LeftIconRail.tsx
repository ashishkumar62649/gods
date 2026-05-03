import type { AppMode } from '../../app/appModes';
import { useUiStore } from '../../store/uiStore';
import IconButton from '../controls/IconButton';

const railItems: Array<{ id: AppMode | 'layers' | 'maritime' | 'settings'; label: string; glyph: string }> = [
  { id: 'world-overview', label: 'World Overview', glyph: 'GL' },
  { id: 'layers', label: 'Layers', glyph: 'LY' },
  { id: 'asset-intelligence', label: 'Aircraft', glyph: 'AC' },
  { id: 'maritime', label: 'Maritime', glyph: 'SH' },
  { id: 'watch-zones', label: 'Hazards', glyph: 'HZ' },
  { id: 'location-intelligence', label: 'Location', glyph: 'LC' },
  { id: 'settings', label: 'Settings', glyph: 'ST' },
];

export default function LeftIconRail() {
  const mode = useUiStore((state) => state.mode);
  const setMode = useUiStore((state) => state.setMode);

  return (
    <nav className="left-icon-rail god-glass">
      {railItems.map((item) => {
        const canSetMode = item.id.includes('-');
        return (
          <IconButton
            active={item.id === mode}
            label={item.label}
            key={item.id}
            onClick={canSetMode ? () => setMode(item.id as AppMode) : undefined}
          >
            {item.glyph}
          </IconButton>
        );
      })}
    </nav>
  );
}
