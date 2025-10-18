import type { CognitoTokens } from '@codemonger-io/passquito-client-js'

/**
 * Default margin to subtract from tokens' expiration time.
 *
 * @remarks
 *
 * This margin lets us decide to refresh tokens earlier than their actual
 * expiration time.
 * If we do not take any margin into account, there is a higher chance that
 * tokens expire during a subsequent operation.
 *
 * @beta
 */
export const DEFAULT_EXPIRATION_MARGIN_SECONDS = 60

/**
 * Minimum expiration time after margin subtraction.
 *
 * @remarks
 *
 * We assume that tokens are valid for at least this duration after subtracting
 * the margin from the tokens' expiration time.
 * This prevents us from too frequently refreshing tokens that have short
 * expiration time.
 *
 * @beta
 */
export const MINIMUM_EXPIRATION_SECONDS = 30

/**
 * Returns if a given `CognitoTokens` is expiring or expired.
 *
 * @param tokens - `CognitoTokens` to check.
 *
 * @param marginSeconds -
 *
 *   Number of seconds to subtract from the tokens' actual expiration time
 *   so that the valid tokens do not expire during a subsequent operation.
 *
 * @beta
 */
export function isCognitoTokensExpiring(
  tokens: CognitoTokens,
  marginSeconds: number = DEFAULT_EXPIRATION_MARGIN_SECONDS,
): boolean {
  const { activatedAt, expiresIn } = tokens
  const reducedExpirationTime = Math.max(
    Math.min(expiresIn, MINIMUM_EXPIRATION_SECONDS),
    expiresIn - marginSeconds,
  )
  return (Date.now() - activatedAt) >= (reducedExpirationTime * 1000)
}
