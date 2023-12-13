/** Account information. */
export type AccountInfo = NoAccountInfo | GuestAccountInfo

/** Account information when no account exists. */
export type NoAccountInfo = {
  type: 'no-account'
}

/** Account information on a guest account. */
export type GuestAccountInfo = {
  type: 'guest'
}
