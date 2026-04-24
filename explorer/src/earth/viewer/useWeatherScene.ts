import { useEffect, type MutableRefObject } from 'react';
import { Viewer as CesiumViewer } from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { WeatherLayerManager } from '../weather/WeatherLayerManager';
import type { ClimateStateSnapshot, WeatherToggleState } from '../weather/weather';

interface UseWeatherSceneOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  weatherLayerManagerRef: MutableRefObject<WeatherLayerManager | null>;
  weatherToggleStateRef: MutableRefObject<WeatherToggleState>;
  weatherToggles: WeatherToggleState;
  climateState: ClimateStateSnapshot | null;
}

export function useWeatherScene({
  viewerRef,
  weatherLayerManagerRef,
  weatherToggleStateRef,
  weatherToggles,
  climateState,
}: UseWeatherSceneOptions) {
  useEffect(() => {
    weatherLayerManagerRef.current?.setClimateState(climateState);
  }, [climateState, weatherLayerManagerRef]);

  useEffect(() => {
    weatherLayerManagerRef.current?.updateWeatherLayers(weatherToggles);
  }, [weatherLayerManagerRef, weatherToggles]);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let localLayerManager: WeatherLayerManager | null = null;
    let attempts = 0;
    const maxAttempts = 600;

    const pollForViewer = () => {
      if (cancelled) {
        return;
      }
      attempts += 1;

      const viewer = viewerRef.current?.cesiumElement;
      const ready = Boolean(viewer) && !viewer?.isDestroyed();
      if (!ready) {
        if (attempts <= maxAttempts) {
          rafId = requestAnimationFrame(pollForViewer);
        }
        return;
      }

      const viewerUsed = viewer as CesiumViewer;
      const layerManager = new WeatherLayerManager(viewerUsed);
      weatherLayerManagerRef.current = layerManager;
      localLayerManager = layerManager;
      layerManager.setClimateState(climateState);
      layerManager.updateWeatherLayers(weatherToggleStateRef.current);
    };

    rafId = requestAnimationFrame(pollForViewer);

    return () => {
      cancelled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      localLayerManager?.destroy();
      if (weatherLayerManagerRef.current === localLayerManager) {
        weatherLayerManagerRef.current = null;
      }
    };
  }, [viewerRef, weatherLayerManagerRef, weatherToggleStateRef]);
}
