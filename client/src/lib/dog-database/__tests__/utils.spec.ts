import { describe, expect, it } from 'vitest'

import { isDog, isGuestDog } from '@/lib/dog-database'

describe('dog-database.utils', () => {
  describe('isDog', () => {
    it('should be true for { key: number, name: string }', () => {
      expect(isDog({
        key: 1,
        name: 'ポチ'
      })).toBe(true)
    })

    it('should be true for { key: string, name: string }', () => {
      expect(isDog({
        key: 'dog-id',
        name: 'Pooch'
      })).toBe(true)
    })

    it('should be false for { name: string } missing key', () => {
      expect(isDog({ name: 'ポチ' })).toBe(false)
    })

    it('should be false for { key: number, name: number } wrong name type', () => {
      expect(isDog({
        key: 1,
        name: 2018
      })).toBe(false)
    })

    it('should be false for { key: number } missing name', () => {
      expect(isDog({ key: 1 })).toBe(false)
    })

    it('should be false for "dog"', () => {
      expect(isDog('dog')).toBe(false)
    })

    it('should be false for null', () => {
      expect(isDog(null)).toBe(false)
    })
  })

  describe('isGuestDog', () => {
    it('should be true for a Dog that has `key` of number', () => {
      expect(isGuestDog({
        key: 1,
        name: 'ポチ'
      })).toBe(true)
    })

    it('should be false for a Dog that has `key` of string', () => {
      expect(isGuestDog({
        key: '1',
        name: 'ポチ'
      })).toBe(false)
    })
  })
})
