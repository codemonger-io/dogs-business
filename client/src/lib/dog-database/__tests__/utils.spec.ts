import { describe, expect, it } from 'vitest'

import { isGuestDog } from '@/lib/dog-database'

describe('dog-database.utils', () => {
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
