import type { Dog, GenericDog } from './interfaces'

/** Returns if a given value represent a dog. */
export function isDog(value: unknown): value is GenericDog {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (!('dogId' in value)) {
    return false
  }
  if (typeof (value as GenericDog).name !== 'string') {
    return false
  }
  return true
}

/** Returns if a given `Dog` may represent a dog friend of a guest. */
export function isGuestDog(dog: GenericDog): dog is Dog<number> {
  return typeof dog.dogId === 'number'
}

/** Returns if a given `Dog` may represent a dog friend of an online account. */
export function isOnlineDog(dog: GenericDog): dog is Dog<string> {
  return typeof dog.dogId === 'string'
}
