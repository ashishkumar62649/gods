import { useEffect, useState, type MutableRefObject } from 'react';
import type { SatelliteSceneLayerManager } from '../satellites/SatelliteSceneLayerManager';
import {
  fetchSatelliteSnapshot,
  SATELLITE_POLL_INTERVAL_MS,
  type SatelliteFeedState,
  type SatelliteRecord,
} from '../satellites/satellites';

const INITIAL_SATELLITE_FEED: SatelliteFeedState = {
  status: 'idle',
  sourceLabel: 'Offline',
  message: 'Turn on Satellites to load orbital objects.',
  fetchedAt: null,
  satelliteCount: 0,
  totalAvailable: 0,
};

interface UseSatelliteDataOptions {
  satellitesEnabled: boolean;
  syncSatelliteLayers: (satellites: SatelliteRecord[]) => void;
  satelliteLayerManagerRef: MutableRefObject<SatelliteSceneLayerManager | null>;
}

export function useSatelliteData({
  satellitesEnabled,
  syncSatelliteLayers,
  satelliteLayerManagerRef,
}: UseSatelliteDataOptions) {
  const [satelliteFeed, setSatelliteFeed] = useState(INITIAL_SATELLITE_FEED);

  useEffect(() => {
    satelliteLayerManagerRef.current?.setSatellitesVisible(satellitesEnabled);

    if (!satellitesEnabled) {
      setSatelliteFeed(INITIAL_SATELLITE_FEED);
      return;
    }

    let cancelled = false;
    let activeController: AbortController | null = null;
    let refreshTimer = 0;

    const loadSatellites = async () => {
      if (cancelled) return;

      activeController?.abort();
      activeController = new AbortController();

      setSatelliteFeed((current) =>
        current.status === 'live'
          ? current
          : {
              ...current,
              status: 'loading',
              sourceLabel: 'Connecting',
              message: 'Loading orbital catalog...',
            },
      );

      try {
        const snapshot = await fetchSatelliteSnapshot(activeController.signal);
        if (cancelled) return;

        const satellites = Array.isArray(snapshot.satellites)
          ? snapshot.satellites
          : [];
        const propagatedAt = snapshot.meta?.propagation?.propagatedAt ?? null;
        const tleCount = snapshot.meta?.tle?.count ?? satellites.length;
        const tleError = snapshot.meta?.tle?.error ?? null;

        syncSatelliteLayers(satellites);
        setSatelliteFeed({
          status: 'live',
          sourceLabel: 'Space-Track SGP4',
          message: tleError
            ? `Catalog unavailable: ${tleError}`
            : `${satellites.length.toLocaleString()} satellites active on the globe.`,
          fetchedAt: propagatedAt ?? new Date().toISOString(),
          satelliteCount: satellites.length,
          totalAvailable: tleCount,
        });
      } catch (error) {
        if (cancelled || activeController.signal.aborted) return;

        console.error('[Explorer] Satellite feed failed:', error);
        setSatelliteFeed({
          status: 'error',
          sourceLabel: 'Offline',
          message:
            error instanceof Error
              ? error.message
              : 'Satellite feed is temporarily unavailable.',
          fetchedAt: null,
          satelliteCount: 0,
          totalAvailable: 0,
        });
      }
    };

    void loadSatellites();
    refreshTimer = window.setInterval(loadSatellites, SATELLITE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [satelliteLayerManagerRef, satellitesEnabled, syncSatelliteLayers]);

  return { satelliteFeed };
}
