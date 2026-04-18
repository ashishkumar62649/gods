interface BuildingsToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Minimal on/off toggle for the 3D buildings layer.
 * Shown in the top-left chrome cluster next to Home and Search.
 * Styling lives in app.css (.buildings-toggle).
 */
export default function BuildingsToggle({
  enabled,
  onToggle,
}: BuildingsToggleProps) {
  return (
    <button
      type="button"
      className={
        enabled
          ? 'buildings-toggle buildings-toggle--on'
          : 'buildings-toggle'
      }
      onClick={onToggle}
      aria-pressed={enabled}
      title={
        enabled
          ? 'Buildings visible — click to hide'
          : 'Buildings hidden — click to show'
      }
    >
      Buildings: {enabled ? 'On' : 'Off'}
    </button>
  );
}
