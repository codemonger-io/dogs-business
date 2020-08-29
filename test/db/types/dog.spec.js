import chai from '@test/setup-chai'

import { getObjectiveFormOfDog } from '@db/types/dog'

const { expect } = chai

describe('db/types/dog.getObjectiveFormOfDog', function () {
  it('getObjectiveFormOfDog({ name: "Pooch" }) should return "pooch"', function () {
    const dog = {
      name: 'pooch'
    }
    expect(getObjectiveFormOfDog(dog)).to.equal('pooch')
  })

  it('getObjectiveFormOfDog({ name: "Monaka" }) should return "Monaka"', function () {
    const dog = {
      name: 'Monaka'
    }
    expect(getObjectiveFormOfDog(dog)).to.equal('Monaka')
  })

  it('getObjectiveFormOfDog({ name: "" }) should return "your dog"', function () {
    const dog = {
      name: ''
    }
    expect(getObjectiveFormOfDog(dog)).to.equal('your dog')
  })
})
