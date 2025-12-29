import { describe, expect, it } from 'vitest'

import {
  isHumanFriendInvitationAcceptanceResult,
  isHumanFriendInvitationStatus,
  isNewHumanFriendInvitation,
} from '@/types/human-friend-invitation'

describe('types.human-friend-invitation', () => {
  describe('isNewHumanFriendInvitation', () => {
    it('should be true for { invitationId: "invitation", payload: { type: "issued", expiresAt: 1765599811 } }', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 'invitation',
        payload: {
          type: 'issued',
          expiresAt: 1765599811,
        },
      })).toBe(true)
    })

    it('should be false for { payload: { type: "issued", expiresAt: 1765599811 } } missing invitationId', () => {
      expect(isNewHumanFriendInvitation({
        payload: {
          type: 'issued',
          expiresAt: 1765599811,
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: 123, payload: { type: "issued", expiresAt: 1765599811 } } with non-string invitationId', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 123,
        payload: {
          type: 'issued',
          expiresAt: 1765599811,
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation" } missing payload', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 'invitation',
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { expiresAt: 1765599811 } } missing payload type', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 'invitation',
        payload: {
          expiresAt: 1765599811,
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "accepted", expiresAt: 1765599811 } } with incompatible payload type', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 'invitation',
        payload: {
          type: 'accepted',
          expiresAt: 1765599811,
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "issued" } } missing expiresAt', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 'invitation',
        payload: {
          type: 'issued',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "issued", expiresAt: "1765599811" } } with non-number expiresAt', () => {
      expect(isNewHumanFriendInvitation({
        invitationId: 'invitation',
        payload: {
          type: 'issued',
          expiresAt: '1765599811',
        },
      })).toBe(false)
    })

    it('should be false for null', () => {
      expect(isNewHumanFriendInvitation(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isNewHumanFriendInvitation(undefined)).toBe(false)
    })
  })

  describe('isHumanFriendInvitationStatus', () => {
    it('should be true for { invitationId: "invitation", payload: { type: "eligible", dogName: "もなか" } }', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'eligible',
          dogName: 'もなか',
        },
      })).toBe(true)
    })

    it('should be true for { invitationId: "invitation", payload: { type: "duplicated", dogId: "dog-id" } }', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'duplicated',
          dogId: 'dog-id',
        },
      })).toBe(true)
    })

    it('should be false for { pyaload: { type: "eligible", dogName: "もなか" } } missing invitationId', () => {
      expect(isHumanFriendInvitationStatus({
        payload: {
          type: 'eligible',
          dogName: 'もなか',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: 123, payload: { type: "eligible", dogName: "もなか" } } with non-string invitationId', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 123,
        payload: {
          type: 'eligible',
          dogName: 'もなか',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation" } missing payload', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { dogName: "もなか" } } missing payload type', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          dogName: 'もなか',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "accepted", dogName: "もなか" } } with incompatible payload type', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'accepted',
          dogName: 'もなか',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "eligible" } } missing dogName', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'eligible',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "duplicated" } } missing dogId', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'duplicated',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "eligible", dogName: 123 } } with non-string dogName', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'eligible',
          dogName: 123,
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "duplicated", dogId: 123 } } with non-string dogId', () => {
      expect(isHumanFriendInvitationStatus({
        invitationId: 'invitation',
        payload: {
          type: 'duplicated',
          dogId: 123,
        },
      })).toBe(false)
    })

    it('should be false for null', () => {
      expect(isHumanFriendInvitationStatus(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isHumanFriendInvitationStatus(undefined)).toBe(false)
    })
  })

  describe('isHumanFriendInvitationAcceptanceResult', () => {
    it('should be true for { invitationId: "invitation", payload: { type: "accepted", dogId: "dog-id" } }', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'accepted',
          dogId: 'dog-id',
        },
      })).toBe(true)
    })

    it('should be true for { invitationId: "invitation", payload: { type: "duplicated", dogId: "dog-id" } }', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'duplicated',
          dogId: 'dog-id',
        },
      })).toBe(true)
    })

    it('should be false for { payload: { type: "accepted", dogId: "dog-id" } } missing invitationId', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        payload: {
          type: 'accepted',
          dogId: 'dog-id',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: 123, payload: { type: "accepted", dogId: "dog-id" } } with non-string invitationId', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 123,
        payload: {
          type: 'accepted',
          dogId: 'dog-id',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation" } missing payload', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { dogId: "dog-id"} } missing payload type', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          dogId: 'dog-id',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "issued", dogId: "dog-id" } } with incompatible payload type', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'issued',
          dogId: 'dog-id',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "accepted" } } missing dogId', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'accepted',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "accepted", dogId: 123 } } with non-string dogId', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'accepted',
          dogId: 123,
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "duplicated" } } missing dogId', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'duplicated',
        },
      })).toBe(false)
    })

    it('should be false for { invitationId: "invitation", payload: { type: "duplicated", dogId: 123 } } with non-string dogId', () => {
      expect(isHumanFriendInvitationAcceptanceResult({
        invitationId: 'invitation',
        payload: {
          type: 'duplicated',
          dogId: 123,
        },
      })).toBe(false)
    })

    it('should be false for null', () => {
      expect(isHumanFriendInvitationAcceptanceResult(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isHumanFriendInvitationAcceptanceResult(undefined)).toBe(false)
    })
  })
})
