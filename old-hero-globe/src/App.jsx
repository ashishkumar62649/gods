import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { BACKGROUND_COLOR, CAMERA } from './config/constants.js';
import Scene from './scene/Scene.jsx';

export default function App() {
  return (
    <Canvas
      // dpr capped at 2 — biggest single perf win on Retina/4K displays.
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,     // opaque canvas — no compositing cost, saves a little memory
        stencil: false,   // we never use the stencil buffer
        // Explicit color pipeline (R3F 8.x defaults match, but pinning is safer across versions).
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{
        fov: CAMERA.fov,
        near: CAMERA.near,
        far: CAMERA.far,
        position: CAMERA.position,
      }}
    >
      {/* Scene background — set on the scene so three.js uses it for clearing. */}
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <Scene />
    </Canvas>
  );
}
