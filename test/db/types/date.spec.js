import chai from 'chai'

import { formatDate } from '@db/types/date'

const { expect } = chai

describe('db.types.date.formatDate', function () {
  it('should return "2020-01-01" for new Date(2020, 0, 1)', function () {
    const date = new Date(2020, 0, 1)
    expect(formatDate(date)).to.equal('2020-01-01')
  })

  it('should return "2020-12-31" for new Date(2020, 11, 31)', function () {
    const date = new Date(2020, 11, 31)
    expect(formatDate(date)).to.equal('2020-12-31')
  })

  it('should return "1979-06-17" for new Date(1979, 5, 17, 1, 21, 45)', function () {
    const date = new Date(1979, 5, 17, 1, 21, 45)
    expect(formatDate(date)).to.equal('1979-06-17')
  })

  it('should throw RangeError for new Date("once upon a time")', function () {
    const date = new Date('once upon a time')
    expect(() => formatDate(date)).to.throw(RangeError)
  })
})
