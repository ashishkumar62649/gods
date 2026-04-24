import {
  Credit,
  ImageryLayer,
  MapboxStyleImageryProvider,
  UrlTemplateImageryProvider,
  Viewer,
  type Event,
} from 'cesium';

type TransitProviderKind = 'mapbox' | 'maptiler';
type TransitOverlayKind = 'metro' | 'railway';

interface TransitOverlayManagerOptions {
  overlayKind: TransitOverlayKind;
  alpha: number;
  minimumCameraAltitudeM: number;
  maximumCameraAltitudeM: number;
}

// Paste your provider selection here, or override with VITE_TRANSIT_TILE_PROVIDER.
// Supported values: 'mapbox' or 'maptiler'.
const TRANSIT_TILE_PROVIDER = normalizeProviderKind(
  import.meta.env.VITE_TRANSIT_TILE_PROVIDER,
);

// Mapbox credentials and style IDs.
// Paste your public token and custom style IDs here if you use Mapbox,
// or provide them through matching Vite env vars.
const MAPBOX_ACCESS_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? 'PASTE_MAPBOX_ACCESS_TOKEN_HERE';
const MAPBOX_USERNAME =
  import.meta.env.VITE_MAPBOX_USERNAME ?? 'PASTE_MAPBOX_USERNAME_HERE';
const MAPBOX_METRO_STYLE_ID =
  import.meta.env.VITE_MAPBOX_METRO_STYLE_ID ?? 'PASTE_MAPBOX_METRO_STYLE_ID_HERE';
const MAPBOX_RAILWAY_STYLE_ID =
  import.meta.env.VITE_MAPBOX_RAILWAY_STYLE_ID ?? 'PASTE_MAPBOX_RAILWAY_STYLE_ID_HERE';

// MapTiler credentials and map/style IDs.
// Paste your API key and custom map IDs here if you use MapTiler,
// or provide them through matching Vite env vars.
const MAPTILER_API_KEY =
  import.meta.env.VITE_MAPTILER_API_KEY ?? 'PASTE_MAPTILER_API_KEY_HERE';
const MAPTILER_METRO_STYLE_ID =
  import.meta.env.VITE_MAPTILER_METRO_STYLE_ID ?? 'PASTE_MAPTILER_METRO_STYLE_ID_HERE';
const MAPTILER_RAILWAY_STYLE_ID =
  import.meta.env.VITE_MAPTILER_RAILWAY_STYLE_ID ?? 'PASTE_MAPTILER_RAILWAY_STYLE_ID_HERE';

export class TransitImageryLayerManager {
  private readonly viewer: Viewer;
  private readonly options: TransitOverlayManagerOptions;
  private layer: ImageryLayer | null = null;
  private enabled = false;
  private removeCameraListener: Event.RemoveCallback | null = null;
  private providerLoadPromise: Promise<void> | null = null;

  constructor(viewer: Viewer, options: TransitOverlayManagerOptions) {
    this.viewer = viewer;
    this.options = options;
    this.removeCameraListener = this.viewer.camera.changed.addEventListener(() => {
      this.syncVisibility();
    });
  }

  setVisible(visible: boolean) {
    this.enabled = visible;

    if (visible) {
      this.ensureLayer();
    }

    this.syncVisibility();
  }

  destroy() {
    this.removeCameraListener?.();
    this.removeCameraListener = null;

    if (this.layer) {
      this.viewer.imageryLayers.remove(this.layer, true);
      this.layer = null;
      this.viewer.scene.requestRender();
    }
  }

  private ensureLayer() {
    if (this.layer || this.providerLoadPromise) {
      return;
    }

    this.providerLoadPromise = buildTransitImageryProvider(this.options.overlayKind)
      .then((provider) => {
        if (!provider) {
          const missingConfig = getMissingTransitConfig(
            TRANSIT_TILE_PROVIDER,
            this.options.overlayKind,
          );
          console.warn(
            `[Transit] ${this.options.overlayKind} imagery layer is not configured yet. Missing: ${missingConfig.join(', ')}.`,
          );
          return;
        }

        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        layer.alpha = this.options.alpha;
        layer.show = false;
        this.layer = layer;
        this.syncVisibility();
      })
      .catch((error) => {
        console.error(`[Transit] ${this.options.overlayKind} imagery layer failed:`, error);
      })
      .finally(() => {
        this.providerLoadPromise = null;
      });
  }

  private syncVisibility() {
    if (!this.layer) {
      return;
    }

    const altitude = this.viewer.camera.positionCartographic?.height ?? Number.POSITIVE_INFINITY;
    const withinMinimum = altitude >= this.options.minimumCameraAltitudeM;
    const withinMaximum = altitude <= this.options.maximumCameraAltitudeM;
    const shouldShow = this.enabled && withinMinimum && withinMaximum;

    this.layer.show = shouldShow;
    this.layer.alpha = shouldShow ? this.options.alpha : 0;
    this.viewer.scene.requestRender();
  }
}

async function buildTransitImageryProvider(overlayKind: TransitOverlayKind) {
  if (TRANSIT_TILE_PROVIDER === 'mapbox') {
    const styleId =
      overlayKind === 'metro' ? MAPBOX_METRO_STYLE_ID : MAPBOX_RAILWAY_STYLE_ID;
    if (!isConfigured(MAPBOX_ACCESS_TOKEN) || !isConfigured(MAPBOX_USERNAME) || !isConfigured(styleId)) {
      return null;
    }

    return new MapboxStyleImageryProvider({
      username: MAPBOX_USERNAME,
      styleId,
      accessToken: MAPBOX_ACCESS_TOKEN,
      tilesize: 512,
      scaleFactor: true,
    });
  }

  const styleId = normalizeMapTilerMapId(
    overlayKind === 'metro' ? MAPTILER_METRO_STYLE_ID : MAPTILER_RAILWAY_STYLE_ID,
  );
  if (!isConfigured(MAPTILER_API_KEY) || !isConfigured(styleId)) {
    return null;
  }

  const tileJsonUrl = `https://api.maptiler.com/maps/${styleId}/tiles.json?key=${MAPTILER_API_KEY}`;
  const tileJsonResponse = await fetch(tileJsonUrl);
  if (!tileJsonResponse.ok) {
    throw new Error(
      `MapTiler TileJSON returned ${tileJsonResponse.status} for ${overlayKind}.`,
    );
  }

  const tileJson = await tileJsonResponse.json() as {
    attribution?: string;
    maxzoom?: number;
    minzoom?: number;
    tiles?: string[];
  };
  const tileUrl = tileJson.tiles?.[0];
  if (!tileUrl) {
    throw new Error(`MapTiler TileJSON did not include a raster tile URL for ${overlayKind}.`);
  }

  const sampleTileUrl = tileUrl
    .replace('{z}', String(tileJson.minzoom ?? 0))
    .replace('{x}', '0')
    .replace('{y}', '0');
  const sampleTileResponse = await fetch(sampleTileUrl, { method: 'GET' });
  if (!sampleTileResponse.ok) {
    const providerMessage =
      sampleTileResponse.headers.get('statusText') ??
      sampleTileResponse.statusText ??
      'Rendered map tile request failed.';
    throw new Error(
      `MapTiler rendered tiles are blocked for ${overlayKind} (${sampleTileResponse.status}). ${providerMessage}`,
    );
  }

  return new UrlTemplateImageryProvider({
    // Use the provider's own TileJSON output instead of hand-building the
    // raster URL. Custom MapTiler styles can expose different valid tile
    // templates than the naive hard-coded XYZ pattern.
    url: tileUrl,
    credit: tileJson.attribution ? new Credit(tileJson.attribution) : 'MapTiler',
    enablePickFeatures: false,
    minimumLevel: tileJson.minzoom,
    maximumLevel: tileJson.maxzoom,
  });
}

function isConfigured(value: string | undefined) {
  return Boolean(value) && !String(value).startsWith('PASTE_');
}

function normalizeProviderKind(value: string | undefined): TransitProviderKind {
  return value?.toLowerCase() === 'mapbox' ? 'mapbox' : 'maptiler';
}

function getMissingTransitConfig(
  providerKind: TransitProviderKind,
  overlayKind: TransitOverlayKind,
) {
  if (providerKind === 'mapbox') {
    const styleIdEnvName =
      overlayKind === 'metro'
        ? 'VITE_MAPBOX_METRO_STYLE_ID'
        : 'VITE_MAPBOX_RAILWAY_STYLE_ID';
    const styleIdValue =
      overlayKind === 'metro' ? MAPBOX_METRO_STYLE_ID : MAPBOX_RAILWAY_STYLE_ID;

    return [
      !isConfigured(MAPBOX_ACCESS_TOKEN) ? 'VITE_MAPBOX_ACCESS_TOKEN' : null,
      !isConfigured(MAPBOX_USERNAME) ? 'VITE_MAPBOX_USERNAME' : null,
      !isConfigured(styleIdValue) ? styleIdEnvName : null,
    ].filter(Boolean) as string[];
  }

  const styleIdEnvName =
    overlayKind === 'metro'
      ? 'VITE_MAPTILER_METRO_STYLE_ID'
      : 'VITE_MAPTILER_RAILWAY_STYLE_ID';
  const styleIdValue = normalizeMapTilerMapId(
    overlayKind === 'metro' ? MAPTILER_METRO_STYLE_ID : MAPTILER_RAILWAY_STYLE_ID,
  );

  return [
    !isConfigured(MAPTILER_API_KEY) ? 'VITE_MAPTILER_API_KEY' : null,
    !isConfigured(styleIdValue) ? styleIdEnvName : null,
  ].filter(Boolean) as string[];
}

function normalizeMapTilerMapId(value: string | undefined) {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const mapsIndex = url.pathname.split('/').findIndex((segment) => segment === 'maps');
    if (mapsIndex >= 0) {
      const candidate = url.pathname.split('/')[mapsIndex + 1];
      if (candidate) {
        return candidate;
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
