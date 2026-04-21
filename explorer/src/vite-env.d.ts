/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN: string;
  readonly VITE_FLIGHT_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
