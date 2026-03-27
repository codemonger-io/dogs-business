import { describe, expect, it } from 'vitest'

import { isSystemConfig } from '@/types/system-config'

describe('types.system-config', () => {
  describe('isSystemConfig', () => {
    it('should be true for { locale: "ja" }', () => {
      expect(isSystemConfig({
        locale: 'ja'
      })).toBe(true)
    })

    it('should be true for { locale: "en" }', () => {
      expect(isSystemConfig({
        locale: 'en'
      })).toBe(true)
    })

    it('should be true for {} missing locale', () => {
      expect(isSystemConfig({})).toBe(true)
    })

    it('should be false for { locale: 123 } with non-string locale', () => {
      expect(isSystemConfig({
        locale: 123
      })).toBe(false)
    })

    it('should be false for { locale: "日本語" } with unsupported locale', () => {
      expect(isSystemConfig({
        locale: '日本語'
      })).toBe(false)
    })

    it('should be false for a string', () => {
      expect(isSystemConfig('ja')).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isSystemConfig(undefined)).toBe(false)
    })

    it('should be false for null', () => {
      expect(isSystemConfig(null)).toBe(false)
    })
  })
})
