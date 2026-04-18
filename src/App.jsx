import { Canvas } from '@react-three/fiber';
import { BACKGROUND_COLOR, CAMERA } from './config/constants.js';
import Scene from './scene/Scene.jsx';

export default function App() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{
        fov: CAMERA.fov,
        near: CAMERA.near,
        far: CAMERA.far,
        position: CAMERA.position,
      }}
    >
      {/* Scene background — sits at the scene root so every later phase inherits it. */}
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <Scene />
    </Canvas>
  );
}
