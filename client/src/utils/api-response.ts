import type { ApiResponse } from '../types/api-response'

/**
 * Wraps a given fetch `Response` as an {@link ApiResponse}.
 *
 * @remarks
 *
 * The type parameter `T` is derived from the `parseJson` function.
 *
 * @param res - Fetch `Response` to wrap.
 *
 * @param parseJson -
 *
 *   Function that parses the JSON body of the response and returns the target
 *   value.
 *
 * @beta
 */
export function wrapFetchResponseWithParse<T>(
  res: Response,
  parseJson: (body: any) => T,
): ApiResponse<T> {
  return {
    parse: async () => {
      if (!res.ok) {
        throw new Error('non-OK response cannot be parsed')
      }
      const body = await res.json()
      return parseJson(body)
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
  return wrapFetchResponseWithParse(res, (body) => {
    if (!validate(body)) {
      throw new RangeError('response body does not conform to expected type')
    }
    return body
  })
}
