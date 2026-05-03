interface LayerToggleProps {
  label: string;
  checked: boolean;
  icon?: string;
  muted?: boolean;
  onChange: () => void;
}

export default function LayerToggle({ label, checked, icon = '', muted = false, onChange }: LayerToggleProps) {
  return (
    <button className={`layer-toggle ${muted ? 'layer-toggle--muted' : ''}`} type="button" onClick={onChange}>
      <span>{icon}</span>
      <b>{label}</b>
      <i className={checked ? 'is-on' : ''} />
    </button>
  );
}
