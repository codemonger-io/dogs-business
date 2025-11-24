import { describe, expect, it } from 'vitest'

import { isAccountInfo, isUserInfo } from '@/types/account-info'

describe('types.account-info', () => {
  describe('isAccountInfo', () => {
    it('should be true for { type: "no-account" }', () => {
      const value = { type: 'no-account' }
      expect(isAccountInfo(value)).toBe(true)
    })

    it('should be true for { type: "guest", activeDogId: 1 }', () => {
      const value = {
        type: 'guest',
        activeDogId: 1
      }
      expect(isAccountInfo(value)).toBe(true)
    })

    it('should be false for { type: "guest", activeDogId: "123" } with non-numeric activeDogId', () => {
      const value = {
        type: 'guest',
        activeDogId: '123'
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be true for { type: "online", publicKeyInfo: {...}, tokens: {...}, userInfo: {...}, activeDogId: "dog" }', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        },
        userInfo: {},
        activeDogId: 'dog'
      }
      expect(isAccountInfo(value)).toBe(true)
    })

    it('should be true for { type: "online", publicKeyInfo: {...}, tokens: {...}, userInfo: {...} } missing activeDogId', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        },
        userInfo: {}
      }
      expect(isAccountInfo(value)).toBe(true)
    })

    it('should be false for { type: "online", tokens: {...}, userInfo: {...} } missing publicKeyInfo', () => {
      const value = {
        type: 'online',
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        },
        userInfo: {}
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "online", publicKeyInfo: {...}, userInfo: {...} } missing tokens', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        userInfo: {}
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "online", publicKeyInfo: {...}, tokens: {...} } missing userInfo', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        }
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "online", publicKeyInfo: "invalid", tokens: {...}, userInfo: {...} } with non-object publicKeyInfo', () => {
      const value = {
        type: 'online',
        publicKeyInfo: 'invalid',
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        },
        userInfo: {}
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "online", publicKeyInfo: {...}, tokens: "invalid", userInfo: {...} } with non-object tokens', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        tokens: 'invalid',
        userInfo: {}
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "online", publicKeyInfo: {...}, tokens: {...}, userInfo: "invalid" } with non-object userInfo', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        },
        userInfo: 'invalid'
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "online", publicKeyInfo: {...}, tokens: {...}, userInfo: {...}, activeDogId: 123 } with non-string activeDogId', () => {
      const value = {
        type: 'online',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'dummy-public-key-id',
          userHandle: 'dummy-user-handle'
        },
        tokens: {
          activatedAt: Date.now(),
          expiresIn: 3600,
          accessToken: 'dummy-access-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token'
        },
        userInfo: {},
        activeDogId: 123
      }
      expect(isAccountInfo(value)).toBe(false)
    })

    it('should be false for { type: "unknown" }', () => {
      expect(isAccountInfo({ type: 'unknown' })).toBe(false)
    })

    it('should be false for {}', () => {
      expect(isAccountInfo({})).toBe(false)
    })

    it('should be false for a string', () => {
      expect(isAccountInfo('no-account')).toBe(false)
    })

    it('should be false for null', () => {
      expect(isAccountInfo(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isAccountInfo(undefined)).toBe(false)
    })
  })

  describe('isUserInfo', () => {
    it('should be true for {}', () => {
      expect(isUserInfo({})).toBe(true)
    })

    it('should be false for a string', () => {
      expect(isUserInfo('user info')).toBe(false)
    })

    it('should be false for null', () => {
      expect(isUserInfo(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isUserInfo(undefined)).toBe(false)
    })
  })
})
