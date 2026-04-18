import { OrbitControls } from '@react-three/drei';
import { CONTROLS, IDLE } from '../config/constants.js';
import useIdleRotation from '../hooks/useIdleRotation.js';

/**
 * Wraps drei's <OrbitControls> with our fixed tuning from constants.js.
 * Phase 3: rotate + zoom only. Pan disabled. Zoom clamped to [minDistance, maxDistance].
 * Phase 5: idle auto-rotation, driven by useIdleRotation; stops on first interaction.
 */
export default function CameraRig() {
  const autoRotate = useIdleRotation();

  return (
    <OrbitControls
      makeDefault
      enableDamping={CONTROLS.enableDamping}
      dampingFactor={CONTROLS.dampingFactor}
      enablePan={false}
      rotateSpeed={CONTROLS.rotateSpeed}
      zoomSpeed={CONTROLS.zoomSpeed}
      minDistance={CONTROLS.minDistance}
      maxDistance={CONTROLS.maxDistance}
      autoRotate={autoRotate}
      autoRotateSpeed={IDLE.speed}
    />
  );
}
