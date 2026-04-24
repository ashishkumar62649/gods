import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Viewer as CesiumViewer } from 'cesium';
import type { CesiumComponentRef } from 'resium';
import type {
  FlightSceneLayerManager,
  FlightSensorLinkState,
} from '../flights/flightLayers';

export interface CockpitPointerState {
  active: boolean;
  pointerId: number | null;
  lastX: number;
  lastY: number;
  moved: boolean;
}

interface UseInteractionGuardsOptions {
  sensorLink: FlightSensorLinkState;
  orbitEnabled: boolean;
  autoBuildingsEnabled: boolean;
  cockpitLookSensitivity: number;
  cancelAutoLandmarkExperience: () => void;
  hudRef: RefObject<HTMLDivElement | null>;
  cockpitPointerRef: MutableRefObject<CockpitPointerState>;
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  flightLayerManagerRef: MutableRefObject<FlightSceneLayerManager | null>;
}

export function useInteractionGuards({
  sensorLink,
  orbitEnabled,
  autoBuildingsEnabled,
  cockpitLookSensitivity,
  cancelAutoLandmarkExperience,
  hudRef,
  cockpitPointerRef,
  viewerRef,
  flightLayerManagerRef,
}: UseInteractionGuardsOptions) {
  useEffect(() => {
    if (sensorLink !== 'flight-deck') return;

    const eventCameFromHud = (target: EventTarget | null) =>
      target instanceof Node && Boolean(hudRef.current?.contains(target));

    const pointerState = cockpitPointerRef.current;

    const onPointerDown = (event: PointerEvent) => {
      if (eventCameFromHud(event.target)) return;
      pointerState.active = true;
      pointerState.pointerId = event.pointerId;
      pointerState.lastX = event.clientX;
      pointerState.lastY = event.clientY;
      pointerState.moved = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerState.active || pointerState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - pointerState.lastX;
      const deltaY = event.clientY - pointerState.lastY;
      pointerState.lastX = event.clientX;
      pointerState.lastY = event.clientY;
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
        pointerState.moved = true;
      }

      flightLayerManagerRef.current?.adjustFlightDeckLook(
        -deltaX * cockpitLookSensitivity,
        -deltaY * cockpitLookSensitivity,
      );

      viewerRef.current?.cesiumElement?.scene.requestRender();
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pointerState.pointerId !== event.pointerId) return;
      pointerState.active = false;
      pointerState.pointerId = null;
      pointerState.moved = false;
    };

    const onWheel = (event: WheelEvent) => {
      if (eventCameFromHud(event.target)) return;
      event.preventDefault();
    };

    window.addEventListener('pointerdown', onPointerDown, {
      capture: true,
      passive: true,
    });
    window.addEventListener('pointermove', onPointerMove, {
      capture: true,
      passive: false,
    });
    window.addEventListener('pointerup', onPointerUp, {
      capture: true,
      passive: true,
    });
    window.addEventListener('pointercancel', onPointerUp, {
      capture: true,
      passive: true,
    });
    window.addEventListener('wheel', onWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      pointerState.active = false;
      pointerState.pointerId = null;
      pointerState.moved = false;
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('wheel', onWheel, true);
    };
  }, [
    cockpitLookSensitivity,
    cockpitPointerRef,
    flightLayerManagerRef,
    hudRef,
    sensorLink,
    viewerRef,
  ]);

  useEffect(() => {
    if (!orbitEnabled && !autoBuildingsEnabled) return;

    const eventCameFromHud = (target: EventTarget | null) =>
      target instanceof Node && Boolean(hudRef.current?.contains(target));

    const stopFromInteraction = (event: Event) => {
      if (eventCameFromHud(event.target)) return;
      cancelAutoLandmarkExperience();
    };
    const stopFromPointerMove = (e: PointerEvent | MouseEvent) => {
      if (eventCameFromHud(e.target)) return;
      if ((e as { buttons?: number }).buttons) {
        cancelAutoLandmarkExperience();
      }
    };
    const listenerOpts = { capture: true, passive: true } as const;

    window.addEventListener('pointerdown', stopFromInteraction, listenerOpts);
    window.addEventListener('mousedown', stopFromInteraction, listenerOpts);
    window.addEventListener('wheel', stopFromInteraction, listenerOpts);
    window.addEventListener('touchstart', stopFromInteraction, listenerOpts);
    window.addEventListener('touchmove', stopFromInteraction, listenerOpts);
    window.addEventListener('pointercancel', stopFromInteraction, listenerOpts);
    window.addEventListener('pointermove', stopFromPointerMove, listenerOpts);
    window.addEventListener('mousemove', stopFromPointerMove, listenerOpts);
    window.addEventListener('keydown', stopFromInteraction, true);
    window.addEventListener('blur', stopFromInteraction, true);

    return () => {
      window.removeEventListener('pointerdown', stopFromInteraction, listenerOpts);
      window.removeEventListener('mousedown', stopFromInteraction, listenerOpts);
      window.removeEventListener('wheel', stopFromInteraction, listenerOpts);
      window.removeEventListener('touchstart', stopFromInteraction, listenerOpts);
      window.removeEventListener('touchmove', stopFromInteraction, listenerOpts);
      window.removeEventListener('pointercancel', stopFromInteraction, listenerOpts);
      window.removeEventListener('pointermove', stopFromPointerMove, listenerOpts);
      window.removeEventListener('mousemove', stopFromPointerMove, listenerOpts);
      window.removeEventListener('keydown', stopFromInteraction, true);
      window.removeEventListener('blur', stopFromInteraction, true);
    };
  }, [autoBuildingsEnabled, cancelAutoLandmarkExperience, hudRef, orbitEnabled]);
}
