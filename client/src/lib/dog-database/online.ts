import type { OnlineAccountProvider } from '../../types/online-account-provider'
import type { Dog, OnlineDogDatabase } from './interfaces'
import type { DogParams } from './types'

/**
 * Implementation of {@link OnlineDogDatabase}.
 *
 * @beta
 */
export class OnlineDogDatabaseImpl implements OnlineDogDatabase {
  /** Initializes with a given credential provider. */
  constructor(private accountProvider: OnlineAccountProvider) {}

  /** Creates a new friend dog for the account. */
  async createDog(params: DogParams): Promise<Dog<string>> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('creating dog', params)
    }
    const url = import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL + '/dog'
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await this.accountProvider.requestIdToken()
      },
      body: JSON.stringify(params)
    })
    if (res.ok) {
      const dog = await res.json()
      if (!isOnlineDog(dog)) {
        throw new Error('invalid dog response from server')
      }
      return dog
    } else {
      if (res.status === 401) {
        this.accountProvider.handleUnauthorized()
      }
      const message = await res.text()
      throw new Error(`failed to create dog: ${res.status} ${message}`)
    }
  }

  /**
   * Returns the dog with a given ID.
   *
   * @param dogId - Unique ID of the dog to obtain.
   */
  async getDog(dogId: string): Promise<Dog<string> | undefined> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('fetching dog with ID', dogId)
    }
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/dog/${dogId}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': await this.accountProvider.requestIdToken()
      }
    })
    if (res.ok) {
      const dog = await res.json()
      if (!isOnlineDog(dog) || dog.dogId !== dogId) {
        throw new Error('invalid dog response from server')
      }
      return dog
    } else {
      if (res.status === 401) {
        this.accountProvider.handleUnauthorized()
      }
      const message = await res.text()
      throw new Error(`failed to fetch dog: ${res.status} ${message}`)
    }
  }
}

// returns if a given value is a `Dog<string>`.
function isOnlineDog(value: unknown): value is Dog<string> {
  if (value == null || typeof value !== 'object') {
    return false
  }
  const maybeDog = value as Dog<string>
  return typeof maybeDog.dogId === 'string' &&
    typeof maybeDog.name === 'string'
}
