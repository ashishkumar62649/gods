import { create } from 'zustand';

export type WeatherLayerCategory =
  | 'satellite'
  | 'radar'
  | 'precipitation'
  | 'wind'
  | 'temperature'
  | 'humidity'
  | 'pressure';

export interface WeatherLayerVariant {
  id: string;
  label: string;
  description: string;
  spaceX?: boolean;
}

export interface WeatherLayerCategoryConfig {
  id: WeatherLayerCategory;
  label: string;
  variants: WeatherLayerVariant[];
}

export const WEATHER_LAYER_CATALOG: WeatherLayerCategoryConfig[] = [
  {
    id: 'satellite',
    label: 'Satellite',
    variants: [
      {
        id: 'satellite.infrared',
        label: 'Infrared',
        description: 'Cloud-top temperature, day & night.',
      },
      {
        id: 'satellite.visible',
        label: 'Visible',
        description: 'Daytime visible-band cloud imagery.',
      },
      {
        id: 'satellite.water-vapor',
        label: 'Water Vapor',
        description: 'Mid-troposphere moisture channel.',
      },
    ],
  },
  {
    id: 'radar',
    label: 'Radar',
    variants: [
      {
        id: 'radar.live',
        label: 'Live Radar',
        description: 'Real-time precipitation mosaic.',
      },
      {
        id: 'radar.nowcast',
        label: 'Nowcast',
        description: 'Radar-extrapolated next 2 hours.',
      },
    ],
  },
  {
    id: 'precipitation',
    label: 'Precipitation',
    variants: [
      {
        id: 'precipitation.rate',
        label: 'Rain Rate',
        description: 'Liquid precipitation intensity (mm/h).',
      },
      {
        id: 'precipitation.accumulated',
        label: 'Accumulated',
        description: '24-hour total precipitation.',
      },
      {
        id: 'precipitation.snow',
        label: 'Snowfall',
        description: 'Snow accumulation depth.',
      },
    ],
  },
  {
    id: 'wind',
    label: 'Wind',
    variants: [
      {
        id: 'wind.10m',
        label: 'Surface · 10 m',
        description: 'Ground-crew & recovery wind.',
      },
      {
        id: 'wind.100m',
        label: 'Hub · 100 m',
        description: 'Booster descent corridor.',
        spaceX: true,
      },
      {
        id: 'wind.500hpa',
        label: 'Mid · 500 hPa',
        description: 'Mid-troposphere transit winds.',
      },
      {
        id: 'wind.250hpa',
        label: 'Jet · 250 hPa',
        description: 'High-altitude shear (Falcon ascent).',
        spaceX: true,
      },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    variants: [
      {
        id: 'temperature.air2m',
        label: 'Air · 2 m',
        description: 'Standard 2-metre air temperature.',
      },
      {
        id: 'temperature.wetbulb',
        label: 'Wet Bulb',
        description: 'Ground-crew thermal-stress threshold.',
        spaceX: true,
      },
      {
        id: 'temperature.sst',
        label: 'Sea Surface',
        description: 'Ocean surface temperature.',
      },
    ],
  },
  {
    id: 'humidity',
    label: 'Humidity',
    variants: [
      {
        id: 'humidity.relative',
        label: 'Relative Humidity',
        description: 'Air saturation percentage.',
      },
      {
        id: 'humidity.dewpoint',
        label: 'Dew Point',
        description: 'Condensation temperature.',
      },
    ],
  },
  {
    id: 'pressure',
    label: 'Pressure',
    variants: [
      {
        id: 'pressure.msl',
        label: 'Mean Sea Level',
        description: 'MSLP — synoptic-scale pressure.',
      },
      {
        id: 'pressure.surface',
        label: 'Surface',
        description: 'True surface pressure.',
      },
    ],
  },
];

export const ALL_VARIANT_IDS: string[] = WEATHER_LAYER_CATALOG.flatMap((cat) =>
  cat.variants.map((v) => v.id),
);

export interface WeatherLayerState {
  activeLayer: string | null;
  expandedCategory: WeatherLayerCategory | null;
}

export interface WeatherLayerActions {
  setActiveLayer(layerId: string | null): void;
  toggleCategory(category: WeatherLayerCategory): void;
  collapseAll(): void;
}

export type WeatherLayerStore = WeatherLayerState & WeatherLayerActions;

export const useWeatherLayerStore = create<WeatherLayerStore>()((set) => ({
  activeLayer: null,
  expandedCategory: null,

  setActiveLayer: (layerId) => set({ activeLayer: layerId }),

  toggleCategory: (category) =>
    set((state) => ({
      expandedCategory: state.expandedCategory === category ? null : category,
    })),

  collapseAll: () => set({ expandedCategory: null }),
}));

export function findVariant(id: string | null): WeatherLayerVariant | null {
  if (!id) return null;
  for (const cat of WEATHER_LAYER_CATALOG) {
    const v = cat.variants.find((variant) => variant.id === id);
    if (v) return v;
  }
  return null;
}

export function findCategoryOfVariant(
  id: string | null,
): WeatherLayerCategory | null {
  if (!id) return null;
  for (const cat of WEATHER_LAYER_CATALOG) {
    if (cat.variants.some((v) => v.id === id)) return cat.id;
  }
  return null;
}
