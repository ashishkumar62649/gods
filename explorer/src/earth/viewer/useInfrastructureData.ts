import { useEffect, useState, type MutableRefObject } from 'react';
import type { CableSceneLayerManager } from '../infrastructure/CableSceneLayerManager';
import {
  fetchInfrastructureSnapshot,
  INFRASTRUCTURE_POLL_INTERVAL_MS,
  type GodsEyeInfrastructure,
  type GodsEyeShip,
  type InfrastructureFeedState,
  type InfrastructureNode,
} from '../infrastructure/infrastructure';

const INITIAL_INFRASTRUCTURE_FEED: InfrastructureFeedState = {
  status: 'idle',
  sourceLabel: 'Offline',
  message: 'Turn on Subsea Cables or Maritime Traffic to load infrastructure intelligence.',
  fetchedAt: null,
  cableCount: 0,
  shipCount: 0,
  nodeCount: 0,
  riskShipCount: 0,
};

interface UseInfrastructureDataOptions {
  infrastructureEnabled: boolean;
  syncInfrastructureLayers: (
    cables: GodsEyeInfrastructure[],
    ships: GodsEyeShip[],
    nodes: InfrastructureNode[],
  ) => void;
  cableLayerManagerRef: MutableRefObject<CableSceneLayerManager | null>;
}

export function useInfrastructureData({
  infrastructureEnabled,
  syncInfrastructureLayers,
  cableLayerManagerRef,
}: UseInfrastructureDataOptions) {
  const [infrastructureFeed, setInfrastructureFeed] =
    useState(INITIAL_INFRASTRUCTURE_FEED);

  useEffect(() => {
    if (!infrastructureEnabled) {
      setInfrastructureFeed(INITIAL_INFRASTRUCTURE_FEED);
      return;
    }

    let cancelled = false;
    let activeController: AbortController | null = null;
    let refreshTimer = 0;

    const loadInfrastructure = async () => {
      if (cancelled) return;
      activeController?.abort();
      activeController = new AbortController();

      setInfrastructureFeed((current) =>
        current.status === 'live'
          ? current
          : {
              ...current,
              status: 'loading',
              sourceLabel: 'Connecting',
              message: 'Loading subsea cable and AIS intelligence...',
            },
      );

      try {
        const snapshot = await fetchInfrastructureSnapshot(activeController.signal);
        if (cancelled) return;

        const cables = Array.isArray(snapshot.cables) ? snapshot.cables : [];
        const ships = Array.isArray(snapshot.ships) ? snapshot.ships : [];
        const nodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
        const riskShipCount = ships.filter((ship) => ship.risk_status === 'RISK').length;

        syncInfrastructureLayers(cables, ships, nodes);
        setInfrastructureFeed({
          status: 'live',
          sourceLabel: snapshot.meta.ships?.connected
            ? 'Subsea Map + AIS'
            : 'Subsea Map',
          message: `${cables.length.toLocaleString()} cables, ${ships.length.toLocaleString()} watched vessels.`,
          fetchedAt:
            snapshot.meta.cables?.lastFetchAt ??
            snapshot.meta.ships?.lastUpdateAt ??
            new Date().toISOString(),
          cableCount: cables.length,
          shipCount: ships.length,
          nodeCount: nodes.length,
          riskShipCount,
        });
      } catch (error) {
        if (cancelled || activeController.signal.aborted) return;

        console.error('[Explorer] Infrastructure feed failed:', error);
        setInfrastructureFeed({
          status: 'error',
          sourceLabel: 'Offline',
          message:
            error instanceof Error
              ? error.message
              : 'Infrastructure feed is temporarily unavailable.',
          fetchedAt: null,
          cableCount: 0,
          shipCount: 0,
          nodeCount: 0,
          riskShipCount: 0,
        });
      }
    };

    void loadInfrastructure();
    refreshTimer = window.setInterval(
      loadInfrastructure,
      INFRASTRUCTURE_POLL_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [cableLayerManagerRef, infrastructureEnabled, syncInfrastructureLayers]);

  return { infrastructureFeed };
}
