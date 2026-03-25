import { describe, expect, it } from 'vitest'

import { isHumanFriend } from '@/types/human-friend'

describe('types.human-friend', () => {
  describe('isHumanFriend', () => {
    it('should be true for { dogId: "dog", userId: "user", userName: "name", isGuardian: true }', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userId: 'user',
        userName: 'name',
        isGuardian: true
      })).toBe(true)
    })

    it('should be true for { dogId: "dog2", userId: "user2", userName: "名前", isGuardian: false }', () => {
      expect(isHumanFriend({
        dogId: 'dog2',
        userId: 'user2',
        userName: '名前',
        isGuardian: false
      })).toBe(true)
    })

    it('should be false for { userId: "user", userName: "name", isGuardian: true } missing dogId', () => {
      expect(isHumanFriend({
        userId: 'user',
        userName: 'name',
        isGuardian: true
      })).toBe(false)
    })

    it('should be false for { dogId: 123, userId: "user", userName: "name", isGuardian: true } with non-string dogId', () => {
      expect(isHumanFriend({
        dogId: 123,
        userId: 'user',
        userName: 'name',
        isGuardian: true
      })).toBe(false)
    })

    it('should be false for { dogId: "dog", userName: "name", isGuardian: true } missing userId', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userName: 'name',
        isGuardian: true
      })).toBe(false)
    })

    it('should be false for { dogId: "dog", userId: 123, userName: "name", isGuardian: true } with non-string userId', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userId: 123,
        userName: 'name',
        isGuardian: true
      })).toBe(false)
    })

    it('should be false for { dogId: "dog", userId: "user", isGuardian: true } missing userName', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userId: 'user',
        isGuardian: true
      })).toBe(false)
    })

    it('should be false for { dogId: "dog", userId: "user", userName: 123, isGuardian: true } with non-string userName', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userId: 'user',
        userName: 123,
        isGuardian: true
      })).toBe(false)
    })

    it('should be false for { dogId: "dog", userId: "user", userName: "name" } missing isGuardian', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userId: 'user',
        userName: 'name',
      })).toBe(false)
    })

    it('should be false for { dogId: "dog", userId: "user", userName: "name", isGuardian: "true" } with non-boolean isGuardian', () => {
      expect(isHumanFriend({
        dogId: 'dog',
        userId: 'user',
        userName: 'name',
        isGuardian: 'true'
      })).toBe(false)
    })

    it('should be false for a string', () => {
      expect(isHumanFriend('friend')).toBe(false)
    })

    it('should be false for null', () => {
      expect(isHumanFriend(null)).toBe(false)
    })

    it('should be false for undefined', () => {
      expect(isHumanFriend(undefined)).toBe(false)
    })
  })
})
