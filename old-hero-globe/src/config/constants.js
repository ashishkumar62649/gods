// Single source of truth for scene tuning.
// Keep magic numbers out of components — edit here to change feel.
//
// Final values locked in Phase 6. Rationale:
//   - CAMERA.fov 45°:      cinematic, not fisheye; Earth fills ~2/3 of viewport at position z=3.
//   - CONTROLS damping 0.08 + rotateSpeed 0.4:   weighty but responsive, no twitch.
//   - CONTROLS minDistance 1.2 (= EARTH_RADIUS * 1.2):  tight framing without clipping.
//   - CONTROLS maxDistance 6:  can't drift into empty space.
//   - IDLE.speed 0.3:       ~1 rotation per 80 seconds — cinematic, not dizzying.
//   - LIGHTS 0.2 + 1.5:     7.5x contrast ratio = clear terminator, night side not black.
//   - EARTH_MATERIAL 0.9 / 0: no specular hotspot; Earth is rough, never metal.

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

export const LIGHTS = {
  ambientIntensity: 0.2,   // soft fill — keeps night side from being pure black
  sunIntensity: 1.5,       // directional "sun" — drives the day/night terminator
  sunPosition: [5, 2, 5],  // off-axis so the terminator is visible at default camera
};

export const EARTH_MATERIAL = {
  roughness: 0.9,  // Earth is not shiny
  metalness: 0.0,  // Earth is not metal
};
