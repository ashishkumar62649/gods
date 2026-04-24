import { INTERVALS } from '../config/constants';
import { API_ROUTES, EXTERNAL_FEEDS } from '../config/endpoints';
import type { ClimateState } from '../store/useClimateStore';

interface RainViewerFrame {
  time?: number;
}

interface RainViewerResponse {
  generated?: number;
  radar?: {
    nowcast?: RainViewerFrame[];
    past?: RainViewerFrame[];
  };
}

interface ClimateStateSnapshot {
  timestamp: string;
  activeSource: 'OWM' | 'FALLBACK';
  precipitationUrl: string;
  temperatureUrl: string;
  cloudsUrl: string;
  windUrl: string;
  pressureUrl: string;
}

export async function fetchClimateState(): Promise<ClimateState> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    INTERVALS.WEATHER_SYNC_MS / 2,
  );

  try {
    const response = await fetch(API_ROUTES.LOCAL_CLIMATE_STATE, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Climate SSOT returned ${response.status}`);
    }

    const snapshot = (await response.json()) as ClimateStateSnapshot;
    const parsedTimestamp = Date.parse(snapshot.timestamp);

    return {
      activeLayers: {
        precipitation: false,
        temperature: false,
        clouds: false,
        fog: false,
        lighting: false,
      },
      dataSource: snapshot.activeSource,
      lastSync: Number.isFinite(parsedTimestamp)
        ? Math.floor(parsedTimestamp / 1000)
        : Math.floor(Date.now() / 1000),
      isLoading: false,
      error: null,
    };
  } catch {
    const fallbackResponse = await fetch(EXTERNAL_FEEDS.RAINVIEWER_TIME);
    if (!fallbackResponse.ok) {
      throw new Error(`RainViewer fallback returned ${fallbackResponse.status}`);
    }

    const fallbackPayload = (await fallbackResponse.json()) as RainViewerResponse;
    const frames = [
      ...(fallbackPayload.radar?.nowcast ?? []),
      ...(fallbackPayload.radar?.past ?? []),
    ];
    const parsedTimestamp =
      frames
        .map((frame) => frame.time)
        .filter((time): time is number => Number.isFinite(time))
        .at(-1) ??
      (Number.isFinite(fallbackPayload.generated)
        ? fallbackPayload.generated
        : Math.floor(Date.now() / 1000));

    return {
      activeLayers: {
        precipitation: true,
        temperature: false,
        clouds: false,
        fog: true,
        lighting: true,
      },
      dataSource: 'FALLBACK',
      lastSync: parsedTimestamp ?? Math.floor(Date.now() / 1000),
      isLoading: false,
      error: null,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
