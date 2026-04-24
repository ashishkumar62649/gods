import { useEffect, useState } from 'react';
import {
  fetchClimateState,
  getClimateSourceLabel,
  WEATHER_STATE_POLL_INTERVAL_MS,
  type ClimateFeedState,
  type ClimateStateSnapshot,
} from '../weather/weather';

const INITIAL_CLIMATE_FEED: ClimateFeedState = {
  status: 'idle',
  sourceLabel: 'Offline',
  message: 'Turn on a climate layer to sync the weather SSOT.',
  fetchedAt: null,
  activeSource: null,
};

interface UseClimateDataOptions {
  climateEnabled: boolean;
  onClimateState: (state: ClimateStateSnapshot | null) => void;
}

export function useClimateData({
  climateEnabled,
  onClimateState,
}: UseClimateDataOptions) {
  const [climateFeed, setClimateFeed] = useState(INITIAL_CLIMATE_FEED);

  useEffect(() => {
    if (!climateEnabled) {
      onClimateState(null);
      setClimateFeed(INITIAL_CLIMATE_FEED);
      return;
    }

    let cancelled = false;
    let activeController: AbortController | null = null;
    let refreshTimer = 0;

    const loadClimateState = async () => {
      if (cancelled) {
        return;
      }

      activeController?.abort();
      activeController = new AbortController();

      setClimateFeed((current) =>
        current.status === 'live'
          ? current
          : {
              ...current,
              status: 'loading',
              sourceLabel: 'Connecting',
              message: 'Synchronizing global climate telemetry...',
            },
      );

      try {
        const state = await fetchClimateState(activeController.signal);
        if (cancelled) {
          return;
        }

        onClimateState(state);
        setClimateFeed({
          status: 'live',
          sourceLabel: getClimateSourceLabel(state.activeSource),
          message:
            state.activeSource === 'OWM'
              ? 'OWM weather tiles are live on the globe.'
              : 'Fallback radar plus native atmospheric simulation is active.',
          fetchedAt: state.timestamp,
          activeSource: state.activeSource,
        });
      } catch (error) {
        if (cancelled || activeController.signal.aborted) {
          return;
        }

        console.error('[Explorer] Climate feed failed:', error);
        onClimateState(null);
        setClimateFeed({
          status: 'error',
          sourceLabel: 'Offline',
          message:
            error instanceof Error
              ? error.message
              : 'Climate telemetry is temporarily unavailable.',
          fetchedAt: null,
          activeSource: null,
        });
      }
    };

    void loadClimateState();
    refreshTimer = window.setInterval(loadClimateState, WEATHER_STATE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(refreshTimer);
    };
  }, [climateEnabled, onClimateState]);

  return { climateFeed };
}
