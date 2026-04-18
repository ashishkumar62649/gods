import { LIGHTS } from '../config/constants.js';

/**
 * Scene lighting.
 * - ambientLight: soft global fill, prevents the night side from being pure black.
 * - directionalLight: the "sun" — parallel rays, produces the terminator line.
 *
 * No shadows (intentional: invisible on a single sphere, significant GPU cost).
 * No point/spot lights (not physically meaningful for a sun).
 */
export default function Lights() {
  return (
    <>
      <ambientLight intensity={LIGHTS.ambientIntensity} />
      <directionalLight
        position={LIGHTS.sunPosition}
        intensity={LIGHTS.sunIntensity}
      />
    </>
  );
}
