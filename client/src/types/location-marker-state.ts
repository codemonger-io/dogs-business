/**
 * Possible values for {@link LocationMarkerState}.
 *
 * @beta
 */
export const LOCATION_MARKER_STATES = [
  'tracking',
  'pinned-within-range',
  'pinned-out-of-range'
] as const;

/**
 * State of the location marker.
 *
 * @beta
 */
export type LocationMarkerState = typeof LOCATION_MARKER_STATES[number];
