import {
  Cartesian3,
  Cartographic,
  HeadingPitchRange,
  Math as CesiumMath,
  Matrix4,
  Rectangle,
  Transforms,
  Viewer as CesiumViewer,
} from 'cesium';
import type { FlightRecord } from '../flights/flights';
import { predictFlightPosition } from '../flights/flights';
import { FLIGHT_EASING, HOME_VIEW } from './viewerConfig';

const METERS_PER_DEG_LAT = 111_320;

export function flyObliqueToPoint(
  viewer: CesiumViewer,
  lonDeg: number,
  latDeg: number,
  altitude: number,
  pitchDeg: number,
  duration = 2,
  onComplete?: () => void,
) {
  const pitchRad = CesiumMath.toRadians(pitchDeg);
  const horizontalOffsetMeters = altitude / Math.tan(Math.abs(pitchRad));
  const latOffsetDeg = horizontalOffsetMeters / METERS_PER_DEG_LAT;
  const cameraLat = latDeg - latOffsetDeg;

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(lonDeg, cameraLat, altitude),
    orientation: {
      heading: 0,
      pitch: pitchRad,
      roll: 0,
    },
    duration,
    easingFunction: FLIGHT_EASING,
    complete: onComplete,
  });
}

export function flyObliqueToDestination(
  viewer: CesiumViewer,
  destination: Rectangle | Cartesian3,
  skipStaging = false,
  onLandmarkLanded?: () => void,
) {
  if (!skipStaging) {
    let targetLon: number;
    let targetLat: number;
    if (destination instanceof Cartesian3) {
      const c = Cartographic.fromCartesian(destination);
      if (!c) return;
      targetLon = CesiumMath.toDegrees(c.longitude);
      targetLat = CesiumMath.toDegrees(c.latitude);
    } else {
      targetLon = CesiumMath.toDegrees((destination.east + destination.west) / 2);
      targetLat = CesiumMath.toDegrees((destination.north + destination.south) / 2);
    }

    const camCarto = getCameraCartographic(viewer);
    if (!camCarto) return;
    const camSurface = Cartesian3.fromRadians(
      camCarto.longitude,
      camCarto.latitude,
      0,
    );
    const tgtSurface = Cartesian3.fromDegrees(targetLon, targetLat, 0);

    if (Cartesian3.distance(camSurface, tgtSurface) > 3_000_000) {
      const camLon = CesiumMath.toDegrees(camCarto.longitude);
      const camLat = CesiumMath.toDegrees(camCarto.latitude);
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(camLon, camLat, 12_000_000),
        duration: 1.0,
        easingFunction: FLIGHT_EASING,
        complete: () =>
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(targetLon, targetLat, 12_000_000),
            duration: 1.8,
            easingFunction: FLIGHT_EASING,
            complete: () =>
              flyObliqueToDestination(
                viewer,
                destination,
                true,
                onLandmarkLanded,
              ),
          }),
      });
      return;
    }
  }

  if (destination instanceof Cartesian3) {
    const carto = Cartographic.fromCartesian(destination);
    if (!carto) return;
    const lonDeg = CesiumMath.toDegrees(carto.longitude);
    const latDeg = CesiumMath.toDegrees(carto.latitude);
    flyObliqueToPoint(
      viewer,
      lonDeg,
      latDeg,
      350,
      -50,
      1.8,
      onLandmarkLanded,
    );
    return;
  }

  const rect = destination;
  const widthDeg = CesiumMath.toDegrees(Math.abs(rect.east - rect.west));
  const heightDeg = CesiumMath.toDegrees(Math.abs(rect.north - rect.south));
  const diagDeg = Math.sqrt(widthDeg * widthDeg + heightDeg * heightDeg);
  const diagMeters = diagDeg * METERS_PER_DEG_LAT;
  const centerLonDeg = CesiumMath.toDegrees((rect.east + rect.west) / 2);
  const centerLatDeg = CesiumMath.toDegrees((rect.north + rect.south) / 2);

  if (diagDeg < 0.02) {
    flyObliqueToPoint(viewer, centerLonDeg, centerLatDeg, 600, -45, 2);
  } else if (diagDeg < 0.5) {
    const altitude = Math.max(2000, diagMeters * 1.2);
    flyObliqueToPoint(viewer, centerLonDeg, centerLatDeg, altitude, -55, 2);
  } else if (diagDeg < 10) {
    const altitude = Math.max(30_000, diagMeters * 1.5);
    flyObliqueToPoint(viewer, centerLonDeg, centerLatDeg, altitude, -70, 2);
  } else {
    viewer.camera.flyTo({
      destination: rect,
      duration: 2,
      easingFunction: FLIGHT_EASING,
    });
  }
}

export function buildHome() {
  return {
    destination: Cartesian3.fromDegrees(
      HOME_VIEW.lon,
      HOME_VIEW.lat,
      HOME_VIEW.height,
    ),
    orientation: {
      heading: CesiumMath.toRadians(HOME_VIEW.heading),
      pitch: CesiumMath.toRadians(HOME_VIEW.pitch),
      roll: 0,
    },
  };
}

export function getCameraCartographic(viewer: CesiumViewer) {
  const cartographic = viewer.camera.positionCartographic;
  if (
    !cartographic ||
    !Number.isFinite(cartographic.longitude) ||
    !Number.isFinite(cartographic.latitude) ||
    !Number.isFinite(cartographic.height)
  ) {
    return null;
  }

  return cartographic;
}

export function getFlightCameraTarget(
  flight: FlightRecord,
  secondsAhead: number,
) {
  const predicted = predictFlightPosition(flight, secondsAhead);
  return Cartesian3.fromDegrees(
    predicted.longitude,
    predicted.latitude,
    Math.max(0, predicted.altitudeMeters),
  );
}

export function getFlightCameraOffset(
  viewer: CesiumViewer,
  target: Cartesian3,
) {
  const range = Math.max(1_000, Cartesian3.distance(viewer.camera.position, target));
  return new HeadingPitchRange(
    viewer.camera.heading,
    viewer.camera.pitch,
    range,
  );
}

export function getCockpitCameraPose(
  flight: FlightRecord,
  secondsAhead: number,
  headingOffsetRad: number,
  pitchRad: number,
) {
  const target = getFlightCameraTarget(flight, secondsAhead);
  const headingRad = CesiumMath.toRadians(flight.heading_true_deg);
  const enuTransform = Transforms.eastNorthUpToFixedFrame(target);
  const localUp = new Cartesian3(0, 0, 30);
  const worldPos = Matrix4.multiplyByPoint(enuTransform, localUp, new Cartesian3());

  return {
    destination: worldPos,
    orientation: {
      heading: headingRad + headingOffsetRad,
      pitch: pitchRad,
      roll: 0,
    },
  };
}
