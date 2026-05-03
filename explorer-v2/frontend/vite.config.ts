import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // vite-plugin-cesium copies Cesium's static assets (workers, shaders,
  // widgets.css, Assets folder) to the build output and sets CESIUM_BASE_URL
  // so Cesium can find them at runtime. Without this, the Viewer crashes on load.
  plugins: [react(), cesium()],
  resolve: {
    alias: {
      'satellite.js/dist/io.js': fileURLToPath(
        new URL('./node_modules/satellite.js/dist/io.js', import.meta.url),
      ),
      'satellite.js/dist/propagation.js': fileURLToPath(
        new URL('./node_modules/satellite.js/dist/propagation.js', import.meta.url),
      ),
      'satellite.js/dist/transforms.js': fileURLToPath(
        new URL('./node_modules/satellite.js/dist/transforms.js', import.meta.url),
      ),
    },
  },
  server: {
    port: 5175,
    open: true,
  },
});
