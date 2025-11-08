/**
 * Interface representing an API response.
 *
 * @remarks
 *
 * Intended to extend the `Response` of the Fetch API with a typed `parse`
 * method.
 *
 * @beta
 */
export interface ApiResponse<T> extends Pick<Response, 'ok' | 'status' | 'text'> {
  /**
   * Parses the body into `T`.
   *
   * @throws RangeError - If the response body cannot be parsed into `T`.
   */
  parse(): Promise<T>
}
