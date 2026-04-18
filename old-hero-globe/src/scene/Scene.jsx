import { Suspense } from 'react';
import Earth from './Earth.jsx';
import CameraRig from './CameraRig.jsx';
import Lights from './Lights.jsx';

/**
 * Composition root inside the <Canvas>.
 * Phase 2: Earth.
 * Phase 3: + CameraRig (OrbitControls).
 * Phase 4: + Lights.
 * Later phases add idle rotation, etc.
 */
export default function Scene() {
  return (
    <>
      <Lights />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      <CameraRig />
    </>
  );
}
