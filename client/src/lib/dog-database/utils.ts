import type { Dog } from './interfaces'

/** Returns if a given `Dog` may represent a dog friend of a guest. */
export function isGuestDog(dog: Dog<unknown>): dog is Dog<number> {
  return typeof dog.key === 'number'
}
