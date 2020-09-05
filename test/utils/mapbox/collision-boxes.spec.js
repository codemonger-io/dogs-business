import chai from '@test/setup-chai'

import { boxesIntersect } from '@utils/mapbox/collision-boxes'

const { expect } = chai

describe('boxesIntersect', function () {
  it('boxesIntersect({x1:0,y1:0,x2:1,y2:1}, {x1:0,y1:0,x2:1,y2:1}) should be true', function () {
    const box1 = {
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1
    }
    const box2 = {
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1
    }
    expect(boxesIntersect(box1, box2)).to.be.true
  })

  describe('boxesIntersect(a, b) and boxesIntersect(b, a) should be true', function () {
    it('where a={x1:0, y1:0, x2:1, y2:1} and b={x1:-0.1, y1:0, x2:0.1, y2:1}', function () {
      const a = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1
      }
      const b = {
        x1: -0.1,
        y1: 0,
        x2: 0.1,
        y2: 1
      }
      expect(boxesIntersect(a, b)).to.be.true
      expect(boxesIntersect(b, a)).to.be.true
    })

    it('where a={x1:0, y1:0, x2:1, y2:1} and b={x1:0, y1:-0.1, x2:1, y2:0.1}', function () {
      const a = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1
      }
      const b = {
        x1: 0,
        y1: -0.1,
        x2: 1,
        y2: 0.1
      }
      expect(boxesIntersect(a, b)).to.be.true
      expect(boxesIntersect(b, a)).to.be.true
    })
  })

  describe('boxesIntersect(a, b) and boxesIntersect(b, a) should be false', function () {
    it('where a={x1:0, y1:0, x2:1, y2:1} and b={x1:-1, y1:0, x2:0, y2:1}', function () {
      const a = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1
      }
      const b = {
        x1: -1,
        y1: 0,
        x2: 0,
        y2: 1
      }
      expect(boxesIntersect(a, b)).to.be.false
      expect(boxesIntersect(b, a)).to.be.false
    })

    it('where a={x1:0, y1:0, x2:1, y2:1} and b={x1:0, y1:-1, x2:1, y2:0}', function () {
      const a = {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1
      }
      const b = {
        x1: 0,
        y1: -1,
        x2: 1,
        y2: 0
      }
      expect(boxesIntersect(a, b)).to.be.false
      expect(boxesIntersect(b, a)).to.be.false
    })
  })
})
