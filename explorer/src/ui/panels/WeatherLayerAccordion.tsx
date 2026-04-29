import {
  WEATHER_LAYER_CATALOG,
  useWeatherLayerStore,
  type WeatherLayerCategoryConfig,
  type WeatherLayerVariant,
} from '../../core/store/useWeatherLayerStore';

const ACCORDION_KEYFRAMES = `
@keyframes weather-accordion-expand {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes weather-active-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.55); }
  50% { box-shadow: 0 0 0 4px rgba(34, 211, 238, 0); }
}
`;

export default function WeatherLayerAccordion() {
  const activeLayer = useWeatherLayerStore((s) => s.activeLayer);
  const expandedCategory = useWeatherLayerStore((s) => s.expandedCategory);
  const setActiveLayer = useWeatherLayerStore((s) => s.setActiveLayer);
  const toggleCategory = useWeatherLayerStore((s) => s.toggleCategory);

  return (
    <>
      <style>{ACCORDION_KEYFRAMES}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {WEATHER_LAYER_CATALOG.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            expanded={expandedCategory === category.id}
            activeLayer={activeLayer}
            onToggle={() => toggleCategory(category.id)}
            onSelectVariant={(variantId) =>
              setActiveLayer(variantId === activeLayer ? null : variantId)
            }
          />
        ))}
      </div>
      {activeLayer && (
        <button
          type="button"
          onClick={() => setActiveLayer(null)}
          style={{
            marginTop: '0.6rem',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            color: '#cbd5e1',
            fontSize: '0.62rem',
            padding: '0.4rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Clear active layer
        </button>
      )}
    </>
  );
}

interface CategoryRowProps {
  category: WeatherLayerCategoryConfig;
  expanded: boolean;
  activeLayer: string | null;
  onToggle: () => void;
  onSelectVariant: (variantId: string) => void;
}

function CategoryRow({
  category,
  expanded,
  activeLayer,
  onToggle,
  onSelectVariant,
}: CategoryRowProps) {
  const hasActive = category.variants.some((v) => v.id === activeLayer);

  return (
    <div
      style={{
        background: hasActive
          ? 'linear-gradient(180deg, rgba(8, 47, 73, 0.55), rgba(15, 23, 42, 0.55))'
          : 'rgba(15, 23, 42, 0.4)',
        border: hasActive
          ? '1px solid rgba(34, 211, 238, 0.45)'
          : '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: '0.6rem',
        backdropFilter: 'blur(14px)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.55rem 0.7rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#e2e8f0',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {hasActive && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#22d3ee',
                animation: 'weather-active-pulse 2s ease-in-out infinite',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
          )}
          {category.label}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.6rem',
            opacity: 0.55,
          }}
        >
          {category.variants.length}
          <span
            style={{
              fontSize: '0.85rem',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.25s ease',
              display: 'inline-block',
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            ⌄
          </span>
        </span>
      </button>

      {expanded && (
        <div
          style={{
            padding: '0.25rem 0.5rem 0.55rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            animation: 'weather-accordion-expand 0.22s ease-out',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          {category.variants.map((variant) => (
            <VariantButton
              key={variant.id}
              variant={variant}
              active={activeLayer === variant.id}
              onClick={() => onSelectVariant(variant.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface VariantButtonProps {
  variant: WeatherLayerVariant;
  active: boolean;
  onClick: () => void;
}

function VariantButton({ variant, active, onClick }: VariantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        textAlign: 'left',
        background: active
          ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.35), rgba(14, 116, 144, 0.18))'
          : 'rgba(8, 15, 30, 0.55)',
        border: active
          ? '1px solid rgba(34, 211, 238, 0.6)'
          : '1px solid rgba(148, 163, 184, 0.15)',
        color: active ? '#67e8f9' : '#cbd5e1',
        cursor: 'pointer',
        padding: '0.45rem 0.55rem',
        borderRadius: '0.45rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
        transition: 'border-color 0.2s ease, background 0.2s ease',
      }}
    >
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          {variant.label}
        </span>
        <span style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {variant.spaceX && (
            <span
              style={{
                fontSize: '0.52rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background: 'rgba(244, 114, 182, 0.12)',
                border: '1px solid rgba(244, 114, 182, 0.4)',
                color: '#f9a8d4',
                padding: '0.05rem 0.35rem',
                borderRadius: '0.3rem',
              }}
            >
              SpX
            </span>
          )}
          {active && (
            <span
              style={{
                fontSize: '0.52rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                background: 'rgba(34, 211, 238, 0.18)',
                border: '1px solid rgba(34, 211, 238, 0.5)',
                color: '#67e8f9',
                padding: '0.05rem 0.35rem',
                borderRadius: '0.3rem',
              }}
            >
              ● Active
            </span>
          )}
        </span>
      </span>
      <span
        style={{
          fontSize: '0.6rem',
          opacity: 0.65,
          fontWeight: 400,
          letterSpacing: '0.02em',
        }}
      >
        {variant.description}
      </span>
    </button>
  );
}
