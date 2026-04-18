import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { EARTH_RADIUS, EARTH_MATERIAL } from '../config/constants.js';

/**
 * Textured sphere representing Earth.
 *
 * Phase 4: uses meshStandardMaterial — physically-based, responds to lights.
 * Lights are provided by <Lights /> in Scene.jsx.
 */
export default function Earth() {
  const texture = useTexture('/textures/earth_day.jpg');
  const { gl } = useThree();

  // Configure the texture once, when it (or the renderer) changes.
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    // Mipmaps + trilinear filtering — crisp at every zoom level, no shimmer at grazing angles.
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture, gl]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={EARTH_MATERIAL.roughness}
        metalness={EARTH_MATERIAL.metalness}
      />
    </mesh>
  );
}
