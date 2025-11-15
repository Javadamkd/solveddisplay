/// <reference types="vite/client" />

// Augment known environment variables for better type safety
interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string;
  readonly VITE_USE_XLSX: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_ENABLE_WS: string;
  readonly VITE_SOCKETIO_URL: string;
  readonly VITE_API_PROGRAMS_PATH: string;
  readonly VITE_API_PROGRAM_DETAIL_PATH: string;
  readonly VITE_API_ANNOUNCE_PATH: string;
  readonly VITE_XLSX_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}