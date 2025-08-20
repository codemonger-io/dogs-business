import type { RGBA } from '@codemonger-io/maplibre-geo-circle-layer'
export type { RGBA } from '@codemonger-io/maplibre-geo-circle-layer'

/** RGB components. */
export type RGB = Omit<RGBA, 'alpha'>
