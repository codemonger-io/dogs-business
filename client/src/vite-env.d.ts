/// <reference types="vite/client">

// https://vite.dev/guide/env-and-mode.html#intellisense-for-typescript

interface ViteTypeOptions {
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  // base URL of the Credentials API.
  readonly VITE_CREDENTIALS_API_BASE_URL: string

  // base URL of the Dog's Business Resource API.
  readonly VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL: string

  // base URL of the Dog's Business Map API.
  readonly VITE_DOGS_BUSINESS_MAP_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
