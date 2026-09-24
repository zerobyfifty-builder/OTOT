/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_EMISSION_API_URL?: string;
  readonly VITE_EMISSION_API_KEY?: string;
  readonly VITE_API_URL?: string;
  /** Forces a portal regardless of hostname ('tourist' | 'ministry' | 'vendor'). */
  readonly VITE_FORCE_PORTAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
