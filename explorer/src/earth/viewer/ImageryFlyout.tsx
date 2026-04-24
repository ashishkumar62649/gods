import type { ImageryOption } from './viewerTypes';

interface ImageryFlyoutProps {
  imageryOptions: ImageryOption[];
  selectedImageryId: string;
  onSelect: (option: ImageryOption) => void;
}

export default function ImageryFlyout({
  imageryOptions,
  selectedImageryId,
  onSelect,
}: ImageryFlyoutProps) {
  return (
    <div className="imagery-flyout imagery-flyout--open custom-scrollbar aether-floating-panel">
      <div className="imagery-flyout__header">
        <p className="imagery-flyout__eyebrow aether-kicker">Map Styles</p>
        <h3 className="imagery-flyout__title aether-glow-text">Imagery</h3>
      </div>
      <div className="imagery-flyout__grid">
        {imageryOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={
              option.id === selectedImageryId
                ? 'imagery-option imagery-option--active'
                : 'imagery-option'
            }
            onClick={() => onSelect(option)}
            title={option.tooltip}
          >
            <img
              className="imagery-option__thumb"
              src={option.iconUrl}
              alt=""
            />
            <span className="imagery-option__name">{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
