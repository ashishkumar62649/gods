import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  HeadingPitchRange,
  Math as CesiumMath,
  Matrix4,
  Viewer as CesiumViewer,
} from 'cesium';
import type { CesiumComponentRef } from 'resium';
import { getCameraCartographic } from './cameraUtils';

interface UseOrbitControlsOptions {
  viewerRef: MutableRefObject<CesiumComponentRef<CesiumViewer> | null>;
  buildingsRef: MutableRefObject<Cesium3DTileset | null>;
  autoBuildingsEnabled: boolean;
  setAutoBuildingsMode: (enabled: boolean) => void;
  releaseSensorLink: () => void;
}

export function useOrbitControls({
  viewerRef,
  buildingsRef,
  autoBuildingsEnabled,
  setAutoBuildingsMode,
  releaseSensorLink,
}: UseOrbitControlsOptions) {
  const [orbitEnabled, setOrbitEnabled] = useState(false);
  const orbitEnabledRef = useRef(false);
  const orbitRafRef = useRef(0);
  const orbitTargetRef = useRef<Cartesian3 | null>(null);
  const orbitSessionIdRef = useRef(0);
  const pendingAutoOrbitRevRef = useRef(0);
  const orbitLandmarkHeightRef = useRef(0);
  const orbitRangeRef = useRef<number | null>(null);

  const stopOrbit = useCallback(() => {
    orbitSessionIdRef.current += 1;
    pendingAutoOrbitRevRef.current += 1;
    orbitEnabledRef.current = false;
    setOrbitEnabled(false);

    if (orbitRafRef.current) {
      cancelAnimationFrame(orbitRafRef.current);
      orbitRafRef.current = 0;
    }

    const viewer = viewerRef.current?.cesiumElement;
    if (viewer && !viewer.isDestroyed()) {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    }

    orbitRangeRef.current = null;
  }, [viewerRef]);

  const cancelAutoLandmarkExperience = useCallback(() => {
    stopOrbit();
    if (autoBuildingsEnabled) {
      setAutoBuildingsMode(false);
    }
  }, [autoBuildingsEnabled, setAutoBuildingsMode, stopOrbit]);

  const startOrbit = useCallback(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    if (!orbitTargetRef.current) {
      const cameraCartographic = getCameraCartographic(viewer);
      if (!cameraCartographic) return;
      orbitTargetRef.current = Cartesian3.fromRadians(
        cameraCartographic.longitude,
        cameraCartographic.latitude,
        0,
      );
    }

    const target = orbitTargetRef.current;
    let heading = viewer.camera.heading;
    const pitch = CesiumMath.clamp(
      viewer.camera.pitch,
      CesiumMath.toRadians(-75),
      CesiumMath.toRadians(-15),
    );

    const landmarkHeight = orbitLandmarkHeightRef.current;
    const minRadius = Math.max(landmarkHeight * 2.5, 550);
    const desiredRange =
      orbitRangeRef.current ?? Cartesian3.distance(viewer.camera.position, target);
    const range = Math.max(desiredRange, minRadius);
    const angularSpeed = CesiumMath.clamp(
      100 / range,
      CesiumMath.toRadians(1),
      CesiumMath.toRadians(8),
    );

    const sessionId = ++orbitSessionIdRef.current;
    orbitEnabledRef.current = true;
    setOrbitEnabled(true);

    let lastTime = performance.now();
    const tick = () => {
      if (!orbitEnabledRef.current || sessionId !== orbitSessionIdRef.current) return;

      const activeViewer = viewerRef.current?.cesiumElement;
      if (!activeViewer || activeViewer.isDestroyed()) {
        orbitEnabledRef.current = false;
        setOrbitEnabled(false);
        return;
      }

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      heading += angularSpeed * dt;
      activeViewer.camera.lookAt(target, new HeadingPitchRange(heading, pitch, range));
      orbitRafRef.current = requestAnimationFrame(tick);
    };

    if (orbitRafRef.current) {
      cancelAnimationFrame(orbitRafRef.current);
    }
    orbitRafRef.current = requestAnimationFrame(tick);
  }, [viewerRef]);

  const toggleOrbit = useCallback(() => {
    if (orbitEnabledRef.current) {
      stopOrbit();
      return;
    }

    releaseSensorLink();

    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || viewer.isDestroyed()) return;

    const canvas = viewer.scene.canvas;
    const center = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2,
    );
    const ray = viewer.camera.getPickRay(center);
    const hit = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
    const ellipsoidHit = viewer.camera.pickEllipsoid(center);
    const cameraCartographic = getCameraCartographic(viewer);

    if (!hit && !ellipsoidHit && !cameraCartographic) {
      return;
    }

    orbitTargetRef.current =
      hit ??
      ellipsoidHit ??
      Cartesian3.fromRadians(
        cameraCartographic!.longitude,
        cameraCartographic!.latitude,
        0,
      );
    orbitLandmarkHeightRef.current = 0;
    orbitRangeRef.current = null;
    startOrbit();
  }, [releaseSensorLink, startOrbit, stopOrbit, viewerRef]);

  const refineLandmarkOrbitFrom3D = useCallback(
    (groundTarget: Cartesian3, rev: number) => {
      if (pendingAutoOrbitRevRef.current !== rev) return;

      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || viewer.isDestroyed()) return;

      const carto = Cartographic.fromCartesian(groundTarget);
      if (!carto) return;

      const terrainHeight = viewer.scene.globe.getHeight(carto) ?? 0;
      const measuredHeight = Math.max(
        0,
        (buildingsRef.current?.getHeight(carto, viewer.scene) ?? terrainHeight) -
          terrainHeight,
      );

      orbitLandmarkHeightRef.current = measuredHeight;
      orbitRangeRef.current = Math.max(1100, measuredHeight * 4.2 + 360);
      orbitTargetRef.current = Cartesian3.fromRadians(
        carto.longitude,
        carto.latitude,
        terrainHeight + measuredHeight * 0.25,
      );
      startOrbit();
    },
    [buildingsRef, startOrbit, viewerRef],
  );

  const queueLandmarkOrbit = useCallback(
    (viewer: CesiumViewer, groundTarget: Cartesian3) => {
      const rev = ++pendingAutoOrbitRevRef.current;
      const removeListener = viewer.camera.moveEnd.addEventListener(() => {
        if (pendingAutoOrbitRevRef.current !== rev) {
          removeListener();
          return;
        }

        const distance = Cartesian3.distance(viewer.camera.position, groundTarget);
        if (distance < 2_000) {
          removeListener();
          if (!orbitEnabledRef.current) {
            refineLandmarkOrbitFrom3D(groundTarget, rev);
          }
        }
      });
    },
    [refineLandmarkOrbitFrom3D],
  );

  const queueAreaOrbit = useCallback(
    (viewer: CesiumViewer, rect: { east: number; west: number; north: number; south: number }) => {
      const rev = ++pendingAutoOrbitRevRef.current;
      const removeListener = viewer.camera.moveEnd.addEventListener(() => {
        if (pendingAutoOrbitRevRef.current !== rev) {
          removeListener();
          return;
        }

        removeListener();
        if (orbitEnabledRef.current) return;

        orbitTargetRef.current = Cartesian3.fromRadians(
          (rect.east + rect.west) / 2,
          (rect.north + rect.south) / 2,
          0,
        );
        orbitLandmarkHeightRef.current = 0;
        orbitRangeRef.current = Cartesian3.distance(
          viewer.camera.position,
          orbitTargetRef.current,
        );
        startOrbit();
      });
    },
    [startOrbit],
  );

  const prepareSearchOrbit = useCallback(
    (isLandmark: boolean, landmarkPoint: Cartesian3 | null) => {
      stopOrbit();
      setAutoBuildingsMode(isLandmark);
      orbitLandmarkHeightRef.current = 0;
      orbitTargetRef.current = isLandmark && landmarkPoint ? landmarkPoint : null;
    },
    [setAutoBuildingsMode, stopOrbit],
  );

  return {
    orbitEnabled,
    cancelAutoLandmarkExperience,
    stopOrbit,
    startOrbit,
    toggleOrbit,
    refineLandmarkOrbitFrom3D,
    prepareSearchOrbit,
    queueLandmarkOrbit,
    queueAreaOrbit,
  };
}
