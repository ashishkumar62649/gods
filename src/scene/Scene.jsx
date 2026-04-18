import { Suspense } from 'react';
import Earth from './Earth.jsx';

/**
 * Composition root inside the <Canvas>.
 * Phase 2: only Earth. Later phases add <Lights />, <CameraRig />, etc. here.
 */
export default function Scene() {
  return (
    <Suspense fallback={null}>
      <Earth />
    </Suspense>
  );
}
