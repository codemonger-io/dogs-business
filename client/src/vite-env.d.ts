/// <reference types="vite/client">

// https://vite.dev/guide/env-and-mode.html#intellisense-for-typescript

interface ViteTypeOptions {
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  // base URL of the Credentials API.
  readonly VITE_CREDENTIALS_API_BASE_URL: string

  // base URL of the Dog's Business API.
  readonly VITE_DOGS_BUSINESS_API_BASE_URL: string

  // Mapbox access token for guests.
  readonly VITE_MAPBOX_GUEST_ACCESS_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
