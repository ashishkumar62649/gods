# Frontend Timeline

The v2 frontend timeline is managed by `frontend/src/store/timelineStore.ts` and displayed by `frontend/src/components/shell/BottomTimelineDock.tsx`.

## Timeline State

The store tracks:

- `mode`: `live`, `historical`, or `forecast`
- `currentTimeMs`
- `startTimeMs`
- `endTimeMs`
- `playbackSpeed`
- `isPlaying`
- `scrubPercent`
- per-domain support flags
- unsupported-domain messages

## Current Behavior

- Live mode follows wall-clock time and keeps live polling active.
- Historical mode exposes a past 24 hour window and pauses live flight refresh because aviation snapshots are not database-backed yet.
- Forecast mode exposes a future 72 hour window for domains that can support predicted data, mainly weather and satellites.
- Scrubbing changes `currentTimeMs`; if the user scrubs while in live mode, the timeline switches to historical mode.
- Timeline rows show whether each domain supports the selected mode.

## Renderer Effects

- `LiveIntelEntityRenderer.ts` refreshes when timeline state changes and adds `time` plus `timeMode` query parameters for non-live modes.
- `LiveFlightRenderer.ts` refreshes only in live mode.
- The status footer displays the current timeline mode.

## Backend Work Still Needed

Backend endpoints currently accept the extra timeline query parameters safely, but the next database step is to apply them in SQL:

- `weather_time_series`: filter by `valid_time`, `observed_time`, or `forecast_time`
- `hazard_events`: filter by event `time_index`, active range, and historical windows
- `satellites.state_snapshots`: support historical states and forecast propagation windows
- `aviation.live_flight_snapshots`: store live snapshots before historical playback can work
- `maritime.position_snapshots`: store AIS snapshots before vessel history can work

## Unsupported Modes

The timeline does not silently do nothing. If a domain cannot support a selected mode yet, its row shows the blocker from `unsupportedDomainMessages`.
