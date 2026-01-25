/**
 * Code that represents the reason for sign-in.
 *
 * @remarks
 *
 * - `fresh-sign-up`: a user has just signed up and is signing in with newly
 *   created credentials for the first time
 * - `re-authentication`: a user needs to re-authenticate due to expired tokens
 *
 * @beta
 */
export type SignInReason = 'fresh-sign-up' | 're-authentication'
