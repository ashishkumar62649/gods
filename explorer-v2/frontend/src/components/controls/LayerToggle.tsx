interface LayerToggleProps {
  label: string;
  checked: boolean;
  icon?: string;
  muted?: boolean;
  opacity?: number;
  onChange: () => void;
  onOpacityChange?: (opacity: number) => void;
}

export default function LayerToggle({
  label,
  checked,
  icon = '',
  muted = false,
  opacity = 100,
  onChange,
  onOpacityChange,
}: LayerToggleProps) {
  return (
    <div className={`layer-toggle-wrap ${checked ? 'is-active' : ''}`}>
      <button
        aria-label={`${checked ? 'Hide' : 'Show'} ${label}`}
        className={`layer-toggle ${muted ? 'layer-toggle--muted' : ''}`}
        title={label}
        type="button"
        onClick={onChange}
      >
        <span>{icon}</span>
        <b>{label}</b>
        <i className={checked ? 'is-on' : ''} />
      </button>
      {onOpacityChange ? (
        <label className="layer-opacity-control" title={`${label} opacity`}>
          <span>Opacity</span>
          <input
            aria-label={`${label} opacity`}
            disabled={!checked}
            max={100}
            min={0}
            type="range"
            value={opacity}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
          />
          <em>{opacity}%</em>
        </label>
      ) : null}
    </div>
  );
}
