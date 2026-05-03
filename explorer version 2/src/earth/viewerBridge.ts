import { useMapStore } from '../core/store/useMapStore';

export function searchPlace(query: string) {
  useMapStore.getState().requestSearch(query);
}

export function flyHome() {
  useMapStore.getState().requestFlyHome();
}
