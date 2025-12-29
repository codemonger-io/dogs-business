/**
 * Invitation for a human friend to be a friend of a dog.
 *
 * @remarks
 *
 * `Payload` depends on the context where the invitation is referred to and the
 * state of the invitation.
 *
 * @beta
 */
export interface HumanFriendInvitation<Payload extends HumanFriendInvitationPayload> {
  /** ID of the invitation. */
  invitationId: string

  /** Payload of the invitation. */
  payload: Payload
}

/**
 * Payload of a {@link HumanFriendInvitation}.
 *
 * @beta
 */
export type HumanFriendInvitationPayload =
  | HumanFriendInvitationPayloadIssued
  | HumanFriendInvitationPayloadEligible
  | HumanFriendInvitationPayloadAccepted
  | HumanFriendInvitationPayloadDuplicated

/**
 * Payload of an issued invitation.
 *
 * @beta
 */
export interface HumanFriendInvitationPayloadIssued {
  type: 'issued'

  /**
   * Expiration time of the invitation.
   *
   * @remarks
   *
   * Represented as the number of seconds elapsed since 00:00:00 on January 1,
   * 1970 UTC.
   */
  expiresAt: number
}

/**
 * Payload of an eligible invitation.
 *
 * @remarks
 *
 * An eligible invitation satisfies:
 * - it has not expired
 * - it has not been accepted yet
 * - the user and the dog who issued the invitation are not friends yet
 *
 * @beta
 */
export interface HumanFriendInvitationPayloadEligible {
  type: 'eligible'

  /** Name of the dog who issued the invitation. */
  dogName: string
}

/**
 * Payload of an accepted invitation.
 *
 * @beta
 */
export interface HumanFriendInvitationPayloadAccepted {
  type: 'accepted'

  /** ID of the dog who issued the invitation and became a friend. */
  dogId: string
}

/**
 * Payload that indicates that the user and the dog who issued the invitation
 * are already friends.
 *
 * @beta
 */
export interface HumanFriendInvitationPayloadDuplicated {
  type: 'duplicated'

  /** ID of the dog who is already a friend. */
  dogId: string
}

/**
 * New invitation.
 *
 * @beta
 */
export type NewHumanFriendInvitation = HumanFriendInvitation<HumanFriendInvitationPayloadIssued>

/**
 * Status of an invitation.
 *
 * @beta
 */
export type HumanFriendInvitationStatus = HumanFriendInvitation<
  | HumanFriendInvitationPayloadEligible
  | HumanFriendInvitationPayloadDuplicated
>

/**
 * Result of accepting an invitation.
 *
 * @beta
 */
export type HumanFriendInvitationAcceptanceResult = HumanFriendInvitation<
  | HumanFriendInvitationPayloadAccepted
  | HumanFriendInvitationPayloadDuplicated
>

/**
 * Returns if a given value is a {@link NewHumanFriendInvitation}.
 *
 * @beta
 */
export function isNewHumanFriendInvitation(value: unknown): value is NewHumanFriendInvitation {
  if (value == null) {
    return false
  }
  const maybeNewInvitation = value as NewHumanFriendInvitation
  if (typeof maybeNewInvitation.invitationId !== 'string') {
    return false
  }
  if (maybeNewInvitation.payload?.type !== 'issued') {
    return false
  }
  if (typeof maybeNewInvitation.payload?.expiresAt !== 'number') {
    return false
  }
  return true
}

/**
 * Returns if a given value is a {@link HumanFriendInvitationStatus}.
 *
 * @beta
 */
export function isHumanFriendInvitationStatus(
  value: unknown,
): value is HumanFriendInvitationStatus {
  if (value == null) {
    return false
  }
  const maybeInvitationStatus = value as HumanFriendInvitationStatus
  if (typeof maybeInvitationStatus.invitationId !== 'string') {
    return false
  }
  switch (maybeInvitationStatus.payload?.type) {
    case 'eligible':
      return typeof maybeInvitationStatus.payload.dogName === 'string'
    case 'duplicated':
      return typeof maybeInvitationStatus.payload.dogId === 'string'
    default:
      return false
  }
}

/**
 * Returns if a given value is a {@link HumanFriendInvitationAcceptanceResult}.
 *
 * @beta
 */
export function isHumanFriendInvitationAcceptanceResult(
  value: unknown
): value is HumanFriendInvitationAcceptanceResult {
  if (value == null) {
    return false
  }
  const maybeAcceptanceResult = value as HumanFriendInvitationAcceptanceResult
  if (typeof maybeAcceptanceResult.invitationId !== 'string') {
    return false
  }
  if (maybeAcceptanceResult.payload == null) {
    return false
  }
  if (maybeAcceptanceResult.payload.type !== 'accepted'
    && maybeAcceptanceResult.payload.type !== 'duplicated')
  {
    return false
  }
  if (typeof maybeAcceptanceResult.payload.dogId !== 'string') {
    return false
  }
  return true
}
