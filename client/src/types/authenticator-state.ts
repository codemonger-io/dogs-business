/** State of the authenticator. */
export enum AuthenticatorState {
  /** Non-deterministic state while loading the information. */
  Loading = 'loading',
  /** Welcoming a new user. */
  Welcome = 'welcome',
  /** Guest user. */
  Guest = 'guest'
}
