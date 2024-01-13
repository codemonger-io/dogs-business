import { describe, expect, it } from 'vitest'

import { isGuestAccountInfo } from '@/lib/account-manager/utils'

describe('utils', () => {
  describe('isGuestAccountInfo', () => {
    it('should be true for { type: "guest", mapboxAccessToken: "token", activeDogKey: 1 }', () => {
      expect(isGuestAccountInfo({
        type: 'guest',
        mapboxAccessToken: 'token',
        activeDogKey: 1
      })).toBe(true)
    })

    it('should be true for { type: "guest", mapboxAccessToken: "token" } missing `activeDogKey`', () => {
      expect(isGuestAccountInfo({
        type: 'guest',
        mapboxAccessToken: 'token'
      })).toBe(true)
    })

    it('should be false for { mapboxAccessToken: "token", activeDogKey: 1 } missing `type`', () => {
      expect(isGuestAccountInfo({
        mapboxAccessToken: 'token',
        activeDogKey: 1
      })).toBe(false)
    })

    it('should be false for { type: "guest", activeDogKey: 1 } missing `mapboxAccessToken`', () => {
      expect(isGuestAccountInfo({
        type: 'guest',
        activeDogKey: 1
      })).toBe(false)
    })

    it('should be false for { type: "online", mapboxAccessToken: "token" } non "guest" type', () => {
      expect(isGuestAccountInfo({
        type: 'online',
        mapboxAccessToken: 'token'
      })).toBe(false)
    })

    it('should be false for { type: "guest", mapboxAccessToken: 123, activeDogKey: 1 } with non-string `mapboxAccessToken`', () => {
      expect(isGuestAccountInfo({
        type: 'guest',
        mapboxAccessToken: 123,
        activeDogKey: 1
      })).toBe(false)
    })

    it('should be false for { type: "guest", mapboxAccessToken: "token", activeDogKey: "123" } with non-number `activeDogKey`', () => {
      expect(isGuestAccountInfo({
        type: 'guest',
        mapboxAccessToken: 'token',
        activeDogKey: '123'
      })).toBe(false)
    })

    it('should be false for null', () => {
      expect(isGuestAccountInfo(null)).toBe(false)
    })

    it('should be false for "guest"', () => {
      expect(isGuestAccountInfo('guest')).toBe(false)
    })
  })
})
