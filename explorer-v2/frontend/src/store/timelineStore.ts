import { create } from 'zustand';

export type TimelineMode = 'live' | 'historical' | 'forecast';
export type PlaybackSpeed = 1 | 2 | 4;

export interface TimelineCapability {
  live: boolean;
  historical: boolean;
  forecast: boolean;
}

type TimelineDomain =
  | 'flights'
  | 'satellites'
  | 'weather'
  | 'hazards'
  | 'maritime'
  | 'infrastructure';

interface TimelineState {
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  mode: TimelineMode;
  currentTimeMs: number;
  startTimeMs: number;
  endTimeMs: number;
  scrubPercent: number;
  lastAdvancedAtMs: number;
  supportedDomains: Record<TimelineDomain, TimelineCapability>;
  unsupportedDomainMessages: Record<TimelineDomain, string>;
  togglePlaying: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setMode: (mode: TimelineMode) => void;
  scrubToPercent: (percent: number) => void;
  advance: (realNowMs: number) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FORECAST_MS = 72 * 60 * 60 * 1000;

function windowForMode(mode: TimelineMode, currentTimeMs: number, realNowMs = Date.now()) {
  if (mode === 'live') {
    return {
      currentTimeMs: realNowMs,
      startTimeMs: realNowMs - DAY_MS,
      endTimeMs: realNowMs,
      scrubPercent: 100,
    };
  }

  if (mode === 'forecast') {
    const startTimeMs = realNowMs;
    const endTimeMs = realNowMs + FORECAST_MS;
    const clampedTime = Math.max(startTimeMs, Math.min(endTimeMs, currentTimeMs));
    return {
      currentTimeMs: clampedTime,
      startTimeMs,
      endTimeMs,
      scrubPercent: percentForTime(startTimeMs, endTimeMs, clampedTime),
    };
  }

  const endTimeMs = realNowMs;
  const startTimeMs = realNowMs - DAY_MS;
  const clampedTime = Math.max(startTimeMs, Math.min(endTimeMs, currentTimeMs));
  return {
    currentTimeMs: clampedTime,
    startTimeMs,
    endTimeMs,
    scrubPercent: percentForTime(startTimeMs, endTimeMs, clampedTime),
  };
}

function percentForTime(startTimeMs: number, endTimeMs: number, currentTimeMs: number) {
  const span = Math.max(1, endTimeMs - startTimeMs);
  return Math.round(((currentTimeMs - startTimeMs) / span) * 1000) / 10;
}

function timeForPercent(startTimeMs: number, endTimeMs: number, percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  return startTimeMs + (endTimeMs - startTimeMs) * (clamped / 100);
}

const now = Date.now();

export const useTimelineStore = create<TimelineState>()((set) => ({
  isPlaying: true,
  playbackSpeed: 1,
  mode: 'live',
  ...windowForMode('live', now, now),
  lastAdvancedAtMs: now,
  supportedDomains: {
    flights: { live: true, historical: true, forecast: false },
    satellites: { live: true, historical: true, forecast: true },
    weather: { live: true, historical: true, forecast: true },
    hazards: { live: true, historical: true, forecast: false },
    maritime: { live: true, historical: true, forecast: false },
    infrastructure: { live: true, historical: true, forecast: false },
  },
  unsupportedDomainMessages: {
    flights: 'Aircraft forecast is pending route prediction and intent modeling.',
    satellites: 'Satellite forecast uses propagated orbital states from the latest TLE catalog.',
    weather: 'Weather supports live, historical, and forecast windows when database views are populated.',
    hazards: 'Hazards support live/current and historical event windows; future prediction is source dependent.',
    maritime: 'Maritime forecast is pending vessel route prediction.',
    infrastructure: 'Infrastructure is mostly static; timeline shows known state and related events.',
  },
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setMode: (mode) =>
    set((state) => ({
      mode,
      isPlaying: mode === 'live' ? true : state.isPlaying,
      ...windowForMode(mode, state.currentTimeMs),
      lastAdvancedAtMs: Date.now(),
    })),
  scrubToPercent: (percent) =>
    set((state) => {
      const currentTimeMs = timeForPercent(state.startTimeMs, state.endTimeMs, percent);
      return {
        currentTimeMs,
        scrubPercent: percentForTime(state.startTimeMs, state.endTimeMs, currentTimeMs),
        mode: state.mode === 'live' ? 'historical' : state.mode,
        isPlaying: state.mode === 'live' ? false : state.isPlaying,
        lastAdvancedAtMs: Date.now(),
      };
    }),
  advance: (realNowMs) =>
    set((state) => {
      if (state.mode === 'live') {
        return {
          ...windowForMode('live', realNowMs, realNowMs),
          lastAdvancedAtMs: realNowMs,
        };
      }

      const refreshedWindow = windowForMode(state.mode, state.currentTimeMs, realNowMs);
      if (!state.isPlaying) {
        return {
          ...refreshedWindow,
          lastAdvancedAtMs: realNowMs,
        };
      }

      const elapsedMs = Math.max(0, realNowMs - state.lastAdvancedAtMs);
      const nextTime = Math.min(
        refreshedWindow.endTimeMs,
        refreshedWindow.currentTimeMs + elapsedMs * state.playbackSpeed,
      );
      return {
        ...refreshedWindow,
        currentTimeMs: nextTime,
        scrubPercent: percentForTime(refreshedWindow.startTimeMs, refreshedWindow.endTimeMs, nextTime),
        isPlaying: nextTime < refreshedWindow.endTimeMs,
        lastAdvancedAtMs: realNowMs,
      };
    }),
}));
