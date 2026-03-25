/**
 * Information on a human friend.
 *
 * @beta
 */
export interface HumanFriend {
  /** ID of the dog. */
  dogId: string

  /** ID of the user (human friend). */
  userId: string

  /** Name of the human friend. */
  userName: string

  /** Whether the human friend is the guardian of the dog. */
  isGuardian: boolean
}

/**
 * Returns if a given value is a {@link HumanFriend}.
 *
 * @beta
 */
export function isHumanFriend(value: unknown): value is HumanFriend {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const humanFriend = value as HumanFriend
  if (typeof humanFriend.dogId !== 'string') {
    return false
  }
  if (typeof humanFriend.userId !== 'string') {
    return false
  }
  if (typeof humanFriend.userName !== 'string') {
    return false
  }
  if (typeof humanFriend.isGuardian !== 'boolean') {
    return false
  }
  return true
}
