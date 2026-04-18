import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { IDLE } from '../config/constants.js';

/**
 * Returns a boolean `autoRotate` flag, true at mount (if IDLE.enabledAtStart),
 * flipped to false on the first user interaction with the canvas and never
 * flipped back. Use as the `autoRotate` prop on <OrbitControls>.
 *
 * Listeners are attached to the canvas DOM element (not window) so that
 * clicks on browser UI / devtools don't count as interaction.
 */
export default function useIdleRotation() {
  const canvas = useThree((s) => s.gl.domElement);
  const [autoRotate, setAutoRotate] = useState(IDLE.enabledAtStart);

  useEffect(() => {
    if (!autoRotate) return undefined; // already stopped — no listeners needed

    const stop = () => setAutoRotate(false);

    // pointerdown covers mouse + pen + touch on modern browsers.
    // wheel covers scroll-to-zoom before any pointerdown.
    // touchstart is a belt-and-braces fallback for older mobile Safari.
    canvas.addEventListener('pointerdown', stop, { once: true });
    canvas.addEventListener('wheel', stop, { once: true, passive: true });
    canvas.addEventListener('touchstart', stop, { once: true, passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', stop);
      canvas.removeEventListener('wheel', stop);
      canvas.removeEventListener('touchstart', stop);
    };
  }, [canvas, autoRotate]);

  return autoRotate;
}
