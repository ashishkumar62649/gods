import type { AppMode } from '../../app/appModes';
import { useUiStore } from '../../store/uiStore';
import { useLayerStore } from '../../store/layerStore';
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
  const toggleLeftPanel = useUiStore((state) => state.toggleLeftPanel);
  const toggleMapLayerPicker = useUiStore((state) => state.toggleMapLayerPicker);
  const setLayer = useLayerStore((state) => state.setLayer);

  return (
    <nav className="left-icon-rail god-glass">
      {railItems.map((item) => {
        const canSetMode = item.id.includes('-');
        const onClick =
          item.id === 'layers'
            ? toggleLeftPanel
            : item.id === 'maritime'
              ? () => {
                  setMode('asset-intelligence');
                  setLayer('vesselsAis', true);
                  setLayer('internetCables', true);
                  setLayer('infrastructureAssets', true);
                }
            : item.id === 'settings'
              ? toggleMapLayerPicker
            : canSetMode
              ? () => setMode(item.id as AppMode)
              : undefined;
        return (
          <IconButton
            active={item.id === mode}
            label={item.label}
            key={item.id}
            onClick={onClick}
          >
            {item.glyph}
          </IconButton>
        );
      })}
    </nav>
  );
}
