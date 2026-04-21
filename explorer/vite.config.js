import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
export default defineConfig({
    // vite-plugin-cesium copies Cesium's static assets (workers, shaders,
    // widgets.css, Assets folder) to the build output and sets CESIUM_BASE_URL
    // so Cesium can find them at runtime. Without this, the Viewer crashes on load.
    plugins: [react(), cesium()],
    server: {
        port: 5174, // 5173 is reserved for old-hero-globe
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8788',
                changeOrigin: true,
            },
        },
    },
});
