import type { GuestAccountInfo } from './types'

/** Returns if a given value is a {@link GuestAccountInfo}. */
export function isGuestAccountInfo(value: unknown): value is GuestAccountInfo {
  if (typeof value !== 'object') {
    return false
  }
  if (value == null) {
    return false
  }
  const maybeAccount = value as Partial<GuestAccountInfo>
  if (maybeAccount.type !== 'guest') {
    return false
  }
  if (typeof maybeAccount.mapboxAccessToken !== 'string') {
    return false
  }
  if (
    maybeAccount.activeDogKey != null
    && typeof maybeAccount.activeDogKey !== 'number'
  ) {
    return false
  }
  return true
}
