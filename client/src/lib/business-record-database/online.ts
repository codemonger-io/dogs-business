import type { OnlineAccountProvider } from '../../types/online-account-provider'
import { isCognitoTokensExpiring } from '../../utils/passquito'
import type { BusinessRecord, OnlineBusinessRecordDatabase } from './interfaces'
import type { BusinessRecordParamsOfDog } from './types'
import { isBusinessRecord } from './utils'

/**
 * Implementation of {@link OnlineBusinessRecordDatabase}.
 *
 * @beta
 */
export class OnlineBusinessRecordDatabaseImpl implements OnlineBusinessRecordDatabase {
  constructor(private readonly accountProvider: OnlineAccountProvider) {}

  /** Creates a new business record in the database. */
  async createBusinessRecord(
    params: BusinessRecordParamsOfDog<string>
  ): Promise<BusinessRecord<string, string>> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('OnlineBusinessRecordDatabaseImpl.createBusinessRecord', params)
    }
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/dog/${params.dogId}/business-record`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await this.accountProvider.requestIdToken()
      },
      body: JSON.stringify({
        businessType: params.businessType,
        location: {
          longitude: params.location.longitude,
          latitude: params.location.latitude,
        },
      })
    })
    if (res.ok) {
      const record = await res.json()
      if (!isOnlineRecord(record)) {
        throw new Error('invalid business record response from server')
      }
      return record
    } else {
      if (res.status === 401) {
        this.accountProvider.handleUnauthorized()
      }
      const message = await res.text()
      throw new Error(`failed to create business record: ${res.status} ${message}`)
    }
  }

  /** Loads business records of a given dog from the database. */
  async loadBusinessRecords(dogId: string): Promise<BusinessRecord<string, string>[]> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('OnlineBusinessRecordDatabaseImpl.loadBusinessRecords', dogId)
    }
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/dog/${dogId}/business-records`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': await this.accountProvider.requestIdToken()
      }
    })
    if (res.ok) {
      const records = await res.json()
      if (!Array.isArray(records)) {
        throw new Error('invalid business records response from server')
      }
      if (!records.every(isOnlineRecord)) {
        throw new Error('invalid business records response from server')
      }
      return records
    } else {
      if (res.status === 401) {
        this.accountProvider.handleUnauthorized()
      }
      const message = await res.text()
      throw new Error(`failed to create business record: ${res.status} ${message}`)
    }
  }
}

// returns if a given value is a `BusinessRecord<string, string>`.
function isOnlineRecord(value: unknown): value is BusinessRecord<string, string> {
  if (!isBusinessRecord(value)) {
    return false
  }
  const maybeRecord = value as BusinessRecord<string, string>
  if (typeof maybeRecord.recordId !== 'string') {
    return false
  }
  if (typeof maybeRecord.dogId !== 'string') {
    return false
  }
  return true
}
