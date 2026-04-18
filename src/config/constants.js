// Single source of truth for scene tuning.
// Keep magic numbers out of components — edit here to change feel.

export const BACKGROUND_COLOR = '#05070d'; // dark navy / near-black

export const EARTH_RADIUS = 1;

export const CAMERA = {
  fov: 45,
  near: 0.1,
  far: 100,
  position: [0, 0, 3],
};

export const CONTROLS = {
  enableDamping: true,
  dampingFactor: 0.08,
  enablePan: false,
  rotateSpeed: 0.4,
  zoomSpeed: 0.6,
  minDistance: 1.2,
  maxDistance: 6,
};

export const IDLE = {
  enabledAtStart: true,
  speed: 0.3, // OrbitControls autoRotateSpeed
};
