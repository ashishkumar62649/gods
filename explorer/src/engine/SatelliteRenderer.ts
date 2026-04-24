import {
  Cartesian2,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer as CesiumViewer,
} from 'cesium';
import type { IRenderer } from './IRenderer';
import {
  type SatelliteState,
  useSatelliteStore,
} from '../core/store/useSatelliteStore';
import { SatelliteSceneLayerManager } from '../earth/satellites/SatelliteSceneLayerManager';
import type { SatelliteRecord } from '../earth/satellites/satellites';

export class SatelliteRenderer implements IRenderer {
  private viewer: CesiumViewer | null = null;
  private manager: SatelliteSceneLayerManager | null = null;
  private unsubscribe: (() => void) | null = null;
  private clickHandler: ScreenSpaceEventHandler | null = null;
  private cameraListener: (() => void) | null = null;
  private preRenderListener: (() => void) | null = null;
  private lastSatellites: SatelliteState['satellites'] | null = null;
  private lastVisible: boolean | null = null;
  private lastStarlinkFocus: boolean | null = null;
  private lastNetworkView: boolean | null = null;
  private lastMissionFilters: SatelliteState['missionFilters'] | null = null;
  private lastSelectedSatelliteId: string | null | undefined = undefined;

  attach(viewer: CesiumViewer): void {
    this.viewer = viewer;
    this.manager = new SatelliteSceneLayerManager(viewer);

    this.unsubscribe = useSatelliteStore.subscribe((state) => {
      this.renderSatellites(state);
    });

    this.clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.clickHandler.setInputAction(
      (click: { position: Cartesian2 }) => {
        const satelliteId = this.manager?.pickSatellite(click.position) ?? null;
        useSatelliteStore.getState().setSelectedSatellite(satelliteId);
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    this.cameraListener = () => this.manager?.updateCameraFading();
    viewer.camera.changed.addEventListener(this.cameraListener);

    this.preRenderListener = () => {
      if (useSatelliteStore.getState().satellitesVisible) {
        this.manager?.tickIntelligence();
      }
    };
    viewer.scene.preRender.addEventListener(this.preRenderListener);

    this.renderSatellites(useSatelliteStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.viewer && this.cameraListener) {
      this.viewer.camera.changed.removeEventListener(this.cameraListener);
    }
    this.cameraListener = null;

    if (this.viewer && this.preRenderListener) {
      this.viewer.scene.preRender.removeEventListener(this.preRenderListener);
    }
    this.preRenderListener = null;

    this.clickHandler?.destroy();
    this.clickHandler = null;

    this.manager?.destroy();
    this.manager = null;
    this.viewer = null;
    this.lastSatellites = null;
    this.lastVisible = null;
    this.lastStarlinkFocus = null;
    this.lastNetworkView = null;
    this.lastMissionFilters = null;
    this.lastSelectedSatelliteId = undefined;
  }

  private renderSatellites(state: SatelliteState): void {
    if (!this.manager) return;

    if (state.satellitesVisible !== this.lastVisible) {
      this.lastVisible = state.satellitesVisible;
      this.manager.setSatellitesVisible(state.satellitesVisible);
      if (state.satellitesVisible) this.lastSatellites = null;
    }

    if (state.starlinkFocusEnabled !== this.lastStarlinkFocus) {
      this.lastStarlinkFocus = state.starlinkFocusEnabled;
      this.manager.setStarlinkFocusEnabled(state.starlinkFocusEnabled);
    }

    if (state.networkViewEnabled !== this.lastNetworkView) {
      this.lastNetworkView = state.networkViewEnabled;
      this.manager.setNetworkViewEnabled(state.networkViewEnabled);
    }

    if (state.missionFilters !== this.lastMissionFilters) {
      this.lastMissionFilters = state.missionFilters;
      this.manager.setMissionFilters(state.missionFilters);
    }

    if (state.selectedSatelliteId !== this.lastSelectedSatelliteId) {
      this.lastSelectedSatelliteId = state.selectedSatelliteId;
      this.manager.setSelectedSatelliteId(state.selectedSatelliteId);
    }

    if (state.satellitesVisible && state.satellites !== this.lastSatellites) {
      this.lastSatellites = state.satellites;
      this.manager.syncSatellites(Object.values(state.satellites) as SatelliteRecord[]);
    }
  }
}
