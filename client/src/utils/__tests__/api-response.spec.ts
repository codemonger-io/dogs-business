import { beforeEach, describe, expect, it } from 'vitest'

import type { ApiResponse } from '@/types/api-response'
import { wrapFetchResponse } from '@/utils/api-response'

// simple type for testing.
interface TestType {
  id: number
  name: string
}

// predicate function for `TestType`.
function isTestType(value: unknown): value is TestType {
  if (typeof value !== 'object' || value == null) {
    return false
  }
  const maybeTestType = value as TestType
  if (typeof maybeTestType.id !== 'number') {
    return false
  }
  if (typeof maybeTestType.name !== 'string') {
    return false
  }
  return true
}

describe('wrapFetchResponse', () => {
  describe('with validate expecting an instance of TestType', () => {
    let apiResponse: ApiResponse<TestType>

    describe('with OK response', () => {
      describe('with a valid body', () => {
        const body = JSON.stringify({
          id: 123,
          name: 'test object'
        })

        beforeEach(() => {
          apiResponse = wrapFetchResponse(new Response(body), isTestType)
        })

        it('ok should be true', () => {
          expect(apiResponse.ok).toBe(true)
        })

        it('status should be 200', () => {
          expect(apiResponse.status).toBe(200)
        })

        it('parse should return an instance of TestType', async () => {
          expect(await apiResponse.parse()).toEqual({
            id: 123,
            name: 'test object'
          })
        })

        it('text should return the text representation of the body', async () => {
          expect(await apiResponse.text()).toBe(body)
        })
      })

      describe('but with an invalid body', () => {
        const body = JSON.stringify({
          message: 'this is not a valid TestType object'
        })

        beforeEach(() => {
          apiResponse = wrapFetchResponse(new Response(body), isTestType)
        })

        it('ok should be true', () => {
          expect(apiResponse.ok).toBe(true)
        })

        it('status should be 200', () => {
          expect(apiResponse.status).toBe(200)
        })

        it('parse should throw a RangeError', async () => {
          await expect(apiResponse.parse()).rejects.toThrow(RangeError)
        })

        it('text should return the text representation of the body', async () => {
          expect(await apiResponse.text()).toBe(body)
        })
      })

      describe('but with an invalid JSON body', () => {
        const body = 'invalid JSON body'

        beforeEach(() => {
          apiResponse = wrapFetchResponse(new Response(body), isTestType)
        })

        it('ok should be true', () => {
          expect(apiResponse.ok).toBe(true)
        })

        it('status should be 200', () => {
          expect(apiResponse.status).toBe(200)
        })

        it('parse should throw', async () => {
          await expect(apiResponse.parse()).rejects.toThrow()
        })

        it('text should return the text representation of the body', async () => {
          expect(await apiResponse.text()).toBe(body)
        })
      })
    })

    describe('with Unauthorized (401) response', () => {
      const body = JSON.stringify({
        id: 123,
        name: 'unauthorized error'
      })

      beforeEach(() => {
        apiResponse = wrapFetchResponse(
          new Response(body, {
            status: 401,
            statusText: 'Unauthorized'
          }),
          isTestType
        )
      })

      it('ok should be false', () => {
        expect(apiResponse.ok).toBe(false)
      })

      it('status should be 401', () => {
        expect(apiResponse.status).toBe(401)
      })

      it('parse should throw', async () => {
        await expect(apiResponse.parse()).rejects.toThrow()
      })

      it('text should return the text representation of the body', async () => {
        expect(await apiResponse.text()).toBe(body)
      })
    })
  })
})
