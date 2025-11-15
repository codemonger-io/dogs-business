import { describe, expect, it } from 'vitest'

import { isDog, isGuestDog, isOnlineDog } from '@/lib/dog-database'

describe('dog-database.utils', () => {
  describe('isDog', () => {
    it('should be true for { dogId: number, name: string }', () => {
      expect(isDog({
        dogId: 1,
        name: 'ポチ'
      })).toBe(true)
    })

    it('should be true for { dogId: string, name: string }', () => {
      expect(isDog({
        dogId: 'dog-id',
        name: 'Pooch'
      })).toBe(true)
    })

    it('should be false for { name: string } missing dogId', () => {
      expect(isDog({ name: 'ポチ' })).toBe(false)
    })

    it('should be false for { dogId: number, name: number } wrong name type', () => {
      expect(isDog({
        dogId: 1,
        name: 2018
      })).toBe(false)
    })

    it('should be false for { dogId: number } missing name', () => {
      expect(isDog({ dogId: 1 })).toBe(false)
    })

    it('should be false for "dog"', () => {
      expect(isDog('dog')).toBe(false)
    })

    it('should be false for null', () => {
      expect(isDog(null)).toBe(false)
    })
  })

  describe('isGuestDog', () => {
    it('should be true for a Dog that has `dogId` of number', () => {
      expect(isGuestDog({
        dogId: 1,
        name: 'ポチ'
      })).toBe(true)
    })

    it('should be false for a Dog that has `dogId` of string', () => {
      expect(isGuestDog({
        dogId: '1',
        name: 'ポチ'
      })).toBe(false)
    })
  })

  describe('isOnlineDog', () => {
    it('should be true for a Dog that has `dogId` of string', () => {
      expect(isOnlineDog({
        dogId: 'dog-id',
        name: 'ポチ'
      })).toBe(true)
    })

    it('should be false for a Dog that has `dogId` of number', () => {
      expect(isOnlineDog({
        dogId: 1,
        name: 'ポチ'
      })).toBe(false)
    })
  })
})
