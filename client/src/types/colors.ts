import type { RGBA } from 'mapbox-geo-circle-layer'
export type { RGBA } from 'mapbox-geo-circle-layer'

/** RGB components. */
export type RGB = Omit<RGBA, 'alpha'>
