import type { Viewer as CesiumViewer } from 'cesium';
import type { IRenderer } from './IRenderer';
import {
  type InfrastructureState,
  useInfrastructureStore,
} from '../core/store/useInfrastructureStore';
import { CableSceneLayerManager } from '../earth/infrastructure/CableSceneLayerManager';
import type {
  GodsEyeInfrastructure,
  GodsEyeShip,
  InfrastructureNode,
} from '../earth/infrastructure/infrastructure';

export class InfrastructureRenderer implements IRenderer {
  private manager: CableSceneLayerManager | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastCablesVisible: boolean | null = null;
  private lastCables: InfrastructureState['cables'] | null = null;
  private lastShips: InfrastructureState['ships'] | null = null;
  private lastNodes: InfrastructureState['nodes'] | null = null;

  attach(viewer: CesiumViewer): void {
    this.manager = new CableSceneLayerManager(viewer);
    this.unsubscribe = useInfrastructureStore.subscribe((state) => {
      this.renderInfrastructure(state);
    });
    this.renderInfrastructure(useInfrastructureStore.getState());
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.manager?.destroy();
    this.manager = null;
    this.lastCablesVisible = null;
    this.lastCables = null;
    this.lastShips = null;
    this.lastNodes = null;
  }

  private renderInfrastructure(state: InfrastructureState): void {
    if (!this.manager) return;

    if (state.cablesVisible !== this.lastCablesVisible) {
      this.lastCablesVisible = state.cablesVisible;
      this.manager.setCablesVisible(state.cablesVisible);
      this.manager.setShipsVisible(state.cablesVisible);
      if (state.cablesVisible) {
        this.lastCables = null;
        this.lastShips = null;
        this.lastNodes = null;
      }
    }

    if (
      state.cablesVisible &&
      (
        state.cables !== this.lastCables ||
        state.ships !== this.lastShips ||
        state.nodes !== this.lastNodes
      )
    ) {
      this.lastCables = state.cables;
      this.lastShips = state.ships;
      this.lastNodes = state.nodes;
      this.manager.syncInfrastructure(
        state.cables as GodsEyeInfrastructure[],
        state.ships as GodsEyeShip[],
        state.nodes as InfrastructureNode[],
      );
    }
  }
}
