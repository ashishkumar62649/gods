import { useEffect, useState, type MutableRefObject } from 'react';
import type { MaritimeLayerManager } from '../maritime/MaritimeLayerManager';
import {
  fetchMaritimeSnapshot,
  MARITIME_POLL_INTERVAL_MS,
  type MaritimeFeedState,
  type MaritimeVesselRecord,
} from '../maritime/maritime';

const INITIAL_MARITIME_FEED: MaritimeFeedState = {
  status: 'idle',
  sourceLabel: 'Offline',
  message: 'Turn on Maritime Traffic to load Global Fishing Watch trade vessels.',
  fetchedAt: null,
  vesselCount: 0,
};

interface UseMaritimeDataOptions {
  maritimeEnabled: boolean;
  syncMaritimeLayer: (vessels: MaritimeVesselRecord[]) => void;
  maritimeLayerManagerRef: MutableRefObject<MaritimeLayerManager | null>;
}

export function useMaritimeData({
  maritimeEnabled,
  syncMaritimeLayer,
  maritimeLayerManagerRef,
}: UseMaritimeDataOptions) {
  const [maritimeFeed, setMaritimeFeed] = useState(INITIAL_MARITIME_FEED);

  useEffect(() => {
    maritimeLayerManagerRef.current?.setVisible(maritimeEnabled);

    if (!maritimeEnabled) {
      setMaritimeFeed(INITIAL_MARITIME_FEED);
      syncMaritimeLayer([]);
      return;
    }

    let cancelled = false;
    let activeController: AbortController | null = null;
    let refreshTimer = 0;

    const loadMaritime = async () => {
      if (cancelled) return;

      activeController?.abort();
      activeController = new AbortController();

      setMaritimeFeed((current) =>
        current.status === 'live'
          ? current
          : {
              ...current,
              status: 'loading',
              sourceLabel: 'Connecting',
              message: 'Resolving active cargo and tanker traffic...',
            },
      );

      try {
        const snapshot = await fetchMaritimeSnapshot(activeController.signal);
        if (cancelled) return;

        const vessels = Array.isArray(snapshot.vessels) ? snapshot.vessels : [];
        syncMaritimeLayer(vessels);
        setMaritimeFeed({
          status: snapshot.meta.error ? 'error' : 'live',
          sourceLabel: snapshot.meta.source || 'Global Fishing Watch',
          message: snapshot.meta.error
            ? snapshot.meta.error
            : `${vessels.length.toLocaleString()} cargo and tanker vessels rendered.`,
          fetchedAt: snapshot.meta.fetchedAt,
          vesselCount: vessels.length,
        });
      } catch (error) {
        if (cancelled || activeController.signal.aborted) return;

        console.error('[Explorer] Maritime feed failed:', error);
        syncMaritimeLayer([]);
        setMaritimeFeed({
          status: 'error',
          sourceLabel: 'Offline',
          message:
            error instanceof Error
              ? error.message
              : 'Maritime feed is temporarily unavailable.',
          fetchedAt: null,
          vesselCount: 0,
        });
      }
    };

    void loadMaritime();
    refreshTimer = window.setInterval(loadMaritime, MARITIME_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [maritimeEnabled, maritimeLayerManagerRef, syncMaritimeLayer]);

  return { maritimeFeed };
}
