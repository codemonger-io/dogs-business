/**
 * Access token for map tile requests.
 *
 * @beta
 */
export interface TileAccessToken {
  /**
   * Token string.
   *
   * @remarks
   *
   * The format is not a secret but opaque to clients.
   * Specify this token in the `Authorization` header with the "Bearer " prefix
   * when requesting map tiles.
   */
  readonly token: string

  /**
   * Expiration time of the token. Represented as the number of seconds elapsed
   * since 00:00:00 on January 1, 1970 in UTC.
   */
  readonly expiresAt: number
}
