import { describe, expect, it } from 'vitest'

import { isAuthenticatorState } from '@/types/authenticator-state'

describe('type.authenticator-state', () => {
  describe('isAuthenticatorState', () => {
    it('should be true for { type: "loading" }', () => {
      expect(isAuthenticatorState({ type: 'loading' })).toBe(true)
    })

    it('should be true for { type: "welcoming" }', () => {
      expect(isAuthenticatorState({ type: 'welcoming' })).toBe(true)
    })

    it('should be true for { type: "guest" }', () => {
      expect(isAuthenticatorState({ type: 'guest' })).toBe(true)
    })

    it('should be true for { type: "authenticating", publicKeyInfo: valid PublicKeyInfo', () => {
      expect(isAuthenticatorState({
        type: 'authenticating',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        }
      })).toBe(true)
    })

    it('should be true for { type: "authenticated", publicKeyInfo: valid PublicKeyInfo, tokens: valid CognitoTokens, userInfo: valid UserInfo }', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        },
        userInfo: {
          mapboxAccessToken: 'mapbox-access-token'
        }
      })).toBe(true)
    })

    it('should be true for { type: "refreshing-tokens", publicKeyInfo: valid PublicKeyInfo, tokens: valid CognitoTokens }', () => {
      expect(isAuthenticatorState({
        type: 'refreshing-tokens',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        }
      })).toBe(true)
    })

    it('should be false for null', () => {
      expect(isAuthenticatorState(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isAuthenticatorState(undefined)).toBe(false)
    })

    it('should be false for a string', () => {
      expect(isAuthenticatorState('welcoming')).toBe(false)
    })

    it('should be false for an "unknown" type', () => {
      expect(isAuthenticatorState({ type: 'unknown' })).toBe(false)
    })

    it('should be false for { type: "authenticating" } missing publicKeyInfo', () => {
      expect(isAuthenticatorState({ type: 'authenticating' })).toBe(false)
    })

    it('should be false for { type: "authenticating", publicKeyInfo: {} } with an empty publicKeyInfo', () => {
      expect(isAuthenticatorState({
        type: 'authenticating',
        publicKeyInfo: {}
      })).toBe(false)
    })

    it('should be false for { type: "authenticated", tokens: valid CognitoTokens, userInfo: valid UserInfo } missing publicKeyInfo', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        },
        userInfo: {
          mapboxAccessToken: 'mapbox-access-token'
        }
      })).toBe(false)
    })

    it('should be false for { type: "authenticated", publicKeyInfo: {}, tokens: valid CognitoTokens, userInfo: valid UserInfo } with an empty publicKeyInfo', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        publicKeyInfo: {},
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        },
        userInfo: {
          mapboxAccessToken: 'mapbox-access-token'
        }
      })).toBe(false)
    })

    it('should be false for { type: "authenticated", publicKeyInfo: valid PublicKeyInfo, userInfo: valid UserInfo } missing tokens', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        userInfo: {
          mapboxAccessToken: 'mapbox-access-token'
        }
      })).toBe(false)
    })

    it('should be false for { type: "authenticated", publicKeyInfo: valid PublicKeyInfo, tokens: {}, userInfo: valid UserInfo } with empty tokens', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        tokens: {},
        userInfo: {
          mapboxAccessToken: 'mapbox-access-token'
        }
      })).toBe(false)
    })

    it('should be false for { type: "authenticated", publicKeyInfo: valid PublicKeyInfo, tokens: valid CognitoTokens } missing userInfo', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        }
      })).toBe(false)
    })

    it('should be false for { type: "authenticated", publicKeyInfo: valid PublicKeyInfo, tokens: valid CognitoTokens, userInfo: {} } with empty userInfo', () => {
      expect(isAuthenticatorState({
        type: 'authenticated',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        },
        userInfo: {}
      })).toBe(false)
    })

    it('should be false for { type: "refreshing-tokens", tokens: valid CognitoTokens } missing publicKeyInfo', () => {
      expect(isAuthenticatorState({
        type: 'refreshing-tokens',
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        }
      })).toBe(false)
    })

    it('should be false for { type: "refreshing-tokens", publicKeyInfo: {}, tokens: valid CognitoTokens } with empty publicKeyInfo', () => {
      expect(isAuthenticatorState({
        type: 'refreshing-tokens',
        publicKeyInfo: {},
        tokens: {
          accessToken: 'jwt-access-token',
          idToken: 'jwt-id-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          activatedAt: 1760962792000
        }
      })).toBe(false)
    })

    it('should be false for { type: "refreshing-tokens", publicKeyInfo: valid PublicKeyInfo } missing tokens', () => {
      expect(isAuthenticatorState({
        type: 'refreshing-tokens',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        }
      })).toBe(false)
    })

    it('should be false for { type: "refreshing-tokens", publicKeyInfo: valid PublicKeyInfo, tokens: {} } with empty tokens', () => {
      expect(isAuthenticatorState({
        type: 'refreshing-tokens',
        publicKeyInfo: {
          authenticatorAttachment: 'platform',
          id: 'serial-ID',
          userHandle: 'user-abc'
        },
        tokens: {}
      })).toBe(false)
    })
  })
})
