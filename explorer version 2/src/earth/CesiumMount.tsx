import { useEffect, useRef } from 'react';
import { initializeViewer } from '../engine/ViewerRuntime';

export default function CesiumMount() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const runtime = initializeViewer(containerRef.current);
    return () => runtime.destroy();
  }, []);

  return <div className="god-cesium-mount" ref={containerRef} />;
}
