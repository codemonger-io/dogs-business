/**
 * Provider of the credentials of a specific online account.
 *
 * @beta
 */
export interface OnlineAccountProvider {
  /**
   * Requests the ID token of the online account.
   *
   * @remarks
   *
   * The implementation will refresh the token if it is expiring or expired.
   */
  requestIdToken(): Promise<string>

  /**
   * Handles an unauthorized error.
   *
   * @remarks
   *
   * A client should call this function when it faces an unauthorized (401)
   * error.
   *
   * This function shall trigger a re-authentication flow and immediately
   * return whether the authentication is successful or not.
   */
  handleUnauthorized(): void
}
