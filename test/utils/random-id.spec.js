import chai from '@test/setup-chai'

import { makeRandomId } from '@utils/random-id'

const { expect } = chai

describe('makeRandomId', function () {
  const ALLOWED_CHARACTERS = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f'
  ]

  it('should return a string consisting of 16 characters ranged in [0-9a-z]', function () {
    const id = makeRandomId()
    expect(id).to.have.lengthOf(16)
    for (const c of id) {
      expect(c).to.be.oneOf(ALLOWED_CHARACTERS)
    }
  })
})
