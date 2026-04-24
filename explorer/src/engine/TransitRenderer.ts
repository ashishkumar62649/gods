import {
  Credit,
  ImageryLayer,
  MapboxStyleImageryProvider,
  UrlTemplateImageryProvider,
  type ImageryProvider,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import { COLORS, OPACITY } from '../core/config/theme';
import {
  type TransitState,
  useTransitStore,
} from '../core/store/useTransitStore';

type TransitProviderKind = 'mapbox' | 'maptiler';
type TransitOverlayKind = 'metro' | 'railway';

const TRANSIT_TILE_PROVIDER = normalizeProviderKind(
  import.meta.env.VITE_TRANSIT_TILE_PROVIDER,
);

const MAPBOX_ACCESS_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? 'PASTE_MAPBOX_ACCESS_TOKEN_HERE';
const MAPBOX_USERNAME =
  import.meta.env.VITE_MAPBOX_USERNAME ?? 'PASTE_MAPBOX_USERNAME_HERE';
const MAPBOX_METRO_STYLE_ID =
  import.meta.env.VITE_MAPBOX_METRO_STYLE_ID ?? 'PASTE_MAPBOX_METRO_STYLE_ID_HERE';
const MAPBOX_RAILWAY_STYLE_ID =
  import.meta.env.VITE_MAPBOX_RAILWAY_STYLE_ID ?? 'PASTE_MAPBOX_RAILWAY_STYLE_ID_HERE';

const MAPTILER_API_KEY =
  import.meta.env.VITE_MAPTILER_API_KEY ?? 'PASTE_MAPTILER_API_KEY_HERE';
const MAPTILER_METRO_STYLE_ID =
  import.meta.env.VITE_MAPTILER_METRO_STYLE_ID ?? 'PASTE_MAPTILER_METRO_STYLE_ID_HERE';
const MAPTILER_RAILWAY_STYLE_ID =
  import.meta.env.VITE_MAPTILER_RAILWAY_STYLE_ID ?? 'PASTE_MAPTILER_RAILWAY_STYLE_ID_HERE';

export class TransitRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private unsubscribe: (() => void) | null = null;
  private metroLayer: ImageryLayer | null = null;
  private railwayLayer: ImageryLayer | null = null;
  private metroLoadPromise: Promise<void> | null = null;
  private railwayLoadPromise: Promise<void> | null = null;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.unsubscribe = useTransitStore.subscribe((state) => {
      this.renderTransit(state);
    });
    this.renderTransit(useTransitStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.removeLayer('metro');
    this.removeLayer('railway');
    this.viewer = null;
  }

  private renderTransit(state: TransitState): void {
    const metroVisible =
      state.visibleNetworks.metro &&
      (state.activeZoomBand === 'CITY' || state.activeZoomBand === 'STREET');
    const railwayVisible =
      state.visibleNetworks.railway &&
      (
        state.activeZoomBand === 'REGION' ||
        state.activeZoomBand === 'CITY' ||
        state.activeZoomBand === 'STREET'
      );

    if (metroVisible) {
      this.ensureLayer('metro');
    } else {
      this.removeLayer('metro');
    }

    if (railwayVisible) {
      this.ensureLayer('railway');
    } else {
      this.removeLayer('railway');
    }

    this.viewer?.scene.requestRender();
  }

  private ensureLayer(overlayKind: TransitOverlayKind): void {
    if (!this.viewer || this.viewer.isDestroyed()) {
      return;
    }

    const existingLayer = this.getLayer(overlayKind);
    const existingPromise = this.getLoadPromise(overlayKind);
    if (existingLayer || existingPromise) {
      if (existingLayer) {
        existingLayer.show = true;
        existingLayer.alpha = getLayerAlpha(overlayKind);
      }
      return;
    }

    const loadPromise = buildTransitImageryProvider(overlayKind)
      .then((provider) => {
        if (!this.viewer || this.viewer.isDestroyed() || !provider) {
          return;
        }

        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        layer.alpha = getLayerAlpha(overlayKind);
        layer.show = true;
        this.setLayer(overlayKind, layer);
        this.viewer.scene.requestRender();
      })
      .catch((error) => {
        console.error(`[Transit] ${overlayKind} imagery layer failed:`, error);
      })
      .finally(() => {
        this.setLoadPromise(overlayKind, null);
      });

    this.setLoadPromise(overlayKind, loadPromise);
  }

  private removeLayer(overlayKind: TransitOverlayKind): void {
    const layer = this.getLayer(overlayKind);
    if (!layer) {
      return;
    }

    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.imageryLayers.remove(layer, true);
      this.viewer.scene.requestRender();
    }

    this.setLayer(overlayKind, null);
  }

  private getLayer(overlayKind: TransitOverlayKind): ImageryLayer | null {
    return overlayKind === 'metro' ? this.metroLayer : this.railwayLayer;
  }

  private setLayer(overlayKind: TransitOverlayKind, layer: ImageryLayer | null): void {
    if (overlayKind === 'metro') {
      this.metroLayer = layer;
      return;
    }

    this.railwayLayer = layer;
  }

  private getLoadPromise(overlayKind: TransitOverlayKind): Promise<void> | null {
    return overlayKind === 'metro' ? this.metroLoadPromise : this.railwayLoadPromise;
  }

  private setLoadPromise(
    overlayKind: TransitOverlayKind,
    promise: Promise<void> | null,
  ): void {
    if (overlayKind === 'metro') {
      this.metroLoadPromise = promise;
      return;
    }

    this.railwayLoadPromise = promise;
  }
}

async function buildTransitImageryProvider(
  overlayKind: TransitOverlayKind,
): Promise<ImageryProvider | null> {
  if (TRANSIT_TILE_PROVIDER === 'mapbox') {
    const styleId =
      overlayKind === 'metro' ? MAPBOX_METRO_STYLE_ID : MAPBOX_RAILWAY_STYLE_ID;
    if (
      !isConfigured(MAPBOX_ACCESS_TOKEN) ||
      !isConfigured(MAPBOX_USERNAME) ||
      !isConfigured(styleId)
    ) {
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
    throw new Error(`MapTiler TileJSON did not include a tile URL for ${overlayKind}.`);
  }

  return new UrlTemplateImageryProvider({
    url: tileUrl,
    credit: tileJson.attribution ? new Credit(tileJson.attribution) : 'MapTiler',
    enablePickFeatures: false,
    minimumLevel: tileJson.minzoom,
    maximumLevel: tileJson.maxzoom,
  });
}

function getLayerAlpha(overlayKind: TransitOverlayKind): number {
  return overlayKind === 'metro'
    ? 0.96
    : Math.max(OPACITY.TRANSIT_UNFOCUSED, 1);
}

function isConfigured(value: string | undefined): value is string {
  return Boolean(value) && !String(value).startsWith('PASTE_');
}

function normalizeProviderKind(value: string | undefined): TransitProviderKind {
  return value?.toLowerCase() === 'mapbox' ? 'mapbox' : 'maptiler';
}

function normalizeMapTilerMapId(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const mapsIndex = url.pathname
      .split('/')
      .findIndex((segment) => segment === 'maps');
    const candidate = mapsIndex >= 0
      ? url.pathname.split('/')[mapsIndex + 1]
      : null;
    return candidate || trimmed;
  } catch {
    return trimmed;
  }
}

void COLORS.RAILWAY_AMBER;
void COLORS.TRANSIT_CYAN;
