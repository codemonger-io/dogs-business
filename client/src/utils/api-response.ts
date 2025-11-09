import type { ApiResponse } from '../types/api-response'

/**
 * Wraps a given fetch `Response` as an {@link ApiResponse}.
 *
 * @remarks
 *
 * The type parameter `T` is derived from the `validate` predicate function.
 *
 * @param res - Fetch `Response` to wrap.
 *
 * @param validate -
 *
 *   Predicate function that returns `true` if a given value conforms to the
 *   type `T`. Used to implement the `parse` method.
 *
 * @beta
 */
export function wrapFetchResponse<T>(
  res: Response,
  validate: (value: unknown) => value is T,
): ApiResponse<T> {
  return {
    parse: async () => {
      if (!res.ok) {
        throw new Error('non-OK response cannot be parsed')
      }
      const body = await res.json()
      if (!validate(body)) {
        throw new RangeError('body does not conform to expected type')
      }
      return body
    },
    text: () => res.text(),
    get status() {
      return res.status
    },
    get ok() {
      return res.ok
    }
  }
}
