import { beforeEach, describe, expect, it } from 'vitest'

import { makeTypePredicateForArrayOf } from '@/utils/type-predicates'

describe('utils.type-predicates', () => {
  describe('makeTypePredicateForArrayOf', () => {
    describe('makeTypePreidcateForArrayOf((v) => typeof v === "string")', () => {
      let predicate: (v: unknown) => v is string[]

      beforeEach(() => {
        predicate = makeTypePredicateForArrayOf((v) => typeof v === 'string')
      })

      it('should be true for ["a", "b", "c"]', () => {
        expect(predicate(['a', 'b', 'c'])).toBe(true)
      })

      it('should be true for ["文字列"]', () => {
        expect(predicate(['文字列'])).toBe(true)
      })

      it('should be true for []', () => {
        expect(predicate([])).toBe(true)
      })

      it('should be false for [1, 2, 3]', () => {
        expect(predicate([1, 2, 3])).toBe(false)
      })

      it('should be false for [1, "b", "c"]', () => {
        expect(predicate([1, 'b', 'c'])).toBe(false)
      })

      it('should be false for ["a", 2, "c"]', () => {
        expect(predicate(['a', 2, 'c'])).toBe(false)
      })

      it('should be false for ["a", "b", 3]', () => {
        expect(predicate(['a', 'b', 3])).toBe(false)
      })

      it('should be false for string', () => {
        expect(predicate('string')).toBe(false)
      })

      it('should be false for {}', () => {
        expect(predicate({})).toBe(false)
      })

      it('should be false for null', () => {
        expect(predicate(null)).toBe(false)
      })

      it('should be false for undefined', () => {
        expect(predicate(undefined)).toBe(false)
      })
    })
  })
})
