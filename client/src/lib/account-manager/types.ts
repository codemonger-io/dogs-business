/** Account information. */
export type AccountInfo = NoAccountInfo | GuestAccountInfo

/** Account information when no account exists. */
export type NoAccountInfo = {
  /** Type: always 'no-account'. */
  type: 'no-account'
}

/** Account information on a guest account. */
export type GuestAccountInfo = {
  /** Type: always 'guest'. */
  type: 'guest',
  /** Mapbox access token for the guest. */
  mapboxAccessToken: string,
  /** Key of the active dog. */
  activeDogKey?: number
}
