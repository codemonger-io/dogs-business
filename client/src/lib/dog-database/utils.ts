import type { Dog } from './interfaces'

/** Returns if a given value represent a dog. */
export function isDog(value: unknown): value is Dog<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (!('key' in value)) {
    return false
  }
  if (typeof (value as Dog<unknown>).name !== 'string') {
    return false
  }
  return true
}

/** Returns if a given `Dog` may represent a dog friend of a guest. */
export function isGuestDog(dog: Dog<unknown>): dog is Dog<number> {
  return typeof dog.key === 'number'
}
