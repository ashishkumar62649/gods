import { create } from 'zustand';

export type SatelliteMissionCategory =
  | 'SIGINT'
  | 'NAV'
  | 'COMMS'
  | 'WEATHER'
  | 'OTHER';

export type SatelliteDecayStatus = 'STABLE' | 'DECAYING';

export type SatelliteMissionFilters = Record<
  Exclude<SatelliteMissionCategory, 'OTHER'>,
  boolean
>;

export interface SatelliteData {
  id_norad: string;
  object_name: string;
  object_type: string | null;
  country_origin: string | null;
  launch_date: string | null;
  latitude: number;
  longitude: number;
  altitude_km: number;
  velocity_kps: number | null;
  tle_epoch: string | null;
  inclination_deg: number | null;
  period_minutes: number | null;
  mean_motion_rev_per_day: number | null;
  perigee_km: number | null;
  apogee_km: number | null;
  constellation_id: string | null;
  mission_category: SatelliteMissionCategory;
  decay_status: SatelliteDecayStatus;
  line1: string;
  line2: string;
  data_source: string;
  tle_source: string;
  timestamp: number;
}

export interface SatelliteState {
  satellites: Record<string, SatelliteData>;
  satellitesVisible: boolean;
  starlinkFocusEnabled: boolean;
  networkViewEnabled: boolean;
  selectedSatelliteId: string | null;
  missionFilters: SatelliteMissionFilters;
  feedStatus: 'idle' | 'loading' | 'live' | 'error';
  message: string;
  satelliteCount: number;
}

export interface SatelliteActions {
  upsertSatellites(satellites: SatelliteData[]): void;
  toggleSatellitesVisible(): void;
  toggleStarlinkFocus(): void;
  toggleNetworkView(): void;
  toggleMissionFilter(filter: keyof SatelliteMissionFilters): void;
  setSelectedSatellite(id: string | null): void;
  setSatelliteFeedStatus(status: SatelliteState['feedStatus'], message?: string): void;
}

export type SatelliteStore = SatelliteState & SatelliteActions;

export const useSatelliteStore = create<SatelliteStore>()((set) => ({
  satellites: {},
  satellitesVisible: false,
  starlinkFocusEnabled: false,
  networkViewEnabled: false,
  selectedSatelliteId: null,
  missionFilters: {
    SIGINT: true,
    NAV: true,
    COMMS: true,
    WEATHER: true,
  },
  feedStatus: 'idle',
  message: 'Waiting for satellite feed.',
  satelliteCount: 0,

  upsertSatellites: (satellites) =>
    set((state) => {
      const nextSatellites = { ...state.satellites };

      for (const satellite of satellites) {
        nextSatellites[satellite.id_norad] = satellite;
      }

      return {
        satellites: nextSatellites,
        satelliteCount: Object.keys(nextSatellites).length,
      };
    }),

  toggleSatellitesVisible: () =>
    set((state) => ({
      satellitesVisible: !state.satellitesVisible,
    })),

  toggleStarlinkFocus: () =>
    set((state) => ({
      starlinkFocusEnabled: !state.starlinkFocusEnabled,
    })),

  toggleNetworkView: () =>
    set((state) => ({
      networkViewEnabled: !state.networkViewEnabled,
    })),

  toggleMissionFilter: (filter) =>
    set((state) => ({
      missionFilters: {
        ...state.missionFilters,
        [filter]: !state.missionFilters[filter],
      },
    })),

  setSelectedSatellite: (id) =>
    set({
      selectedSatelliteId: id,
    }),

  setSatelliteFeedStatus: (status, message) =>
    set({
      feedStatus: status,
      message: message ?? (status === 'live' ? 'Satellite feed is live.' : 'Waiting for satellite feed.'),
    }),
}));
