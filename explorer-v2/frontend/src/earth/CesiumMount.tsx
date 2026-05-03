import { useEffect, useRef } from 'react';
import { initializeViewer } from '../engine/ViewerRuntime';
import { setBridgeViewer } from './viewerBridge';

export default function CesiumMount() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const runtime = initializeViewer(containerRef.current);
    setBridgeViewer(runtime.viewer);
    return () => {
      setBridgeViewer(null);
      runtime.destroy();
    };
  }, []);

  return <div className="god-cesium-mount" ref={containerRef} />;
}
