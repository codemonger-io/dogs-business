/**
 * Possible values for {@link MapViewerMode}.
 *
 * @beta
 */
export const MAP_VIEWER_MODES = ['active-dog', 'global'] as const

/**
 * Map viewer mode.
 *
 * @beta
 */
export type MapViewerMode = typeof MAP_VIEWER_MODES[number]
