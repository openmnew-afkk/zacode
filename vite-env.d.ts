/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_API_KEY: string;
  readonly VITE_KODIK_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
