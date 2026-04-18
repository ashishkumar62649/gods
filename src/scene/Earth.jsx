import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { EARTH_RADIUS } from '../config/constants.js';

/**
 * Textured sphere representing Earth.
 *
 * Phase 2 note: uses meshBasicMaterial so the texture is visible without lights.
 * Phase 4 will swap to meshStandardMaterial once Lights.jsx is introduced.
 * No other change is needed here in Phase 4 — only the material tag.
 */
export default function Earth() {
  const texture = useTexture('/textures/earth_day.jpg');
  const { gl } = useThree();

  // Configure the texture once, when it (or the renderer) changes.
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.needsUpdate = true;
  }, [texture, gl]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
