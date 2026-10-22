/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_URL?: string;
  readonly API_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
