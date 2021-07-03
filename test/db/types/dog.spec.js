import chai from '@test/setup-chai'

import {
  getObjectiveFormOfDog,
  getPossessiveFormOfDog,
} from '@db/types/dog'

const { expect } = chai

describe('db/types/dog.getPossessiveFormOfDog', function () {
  it('getPossessiveFormOfDog({ name: "pooch" }) should return "pooch\'s"', function () {
    const dog = {
      name: 'pooch',
    }
    expect(getPossessiveFormOfDog(dog)).to.equal("pooch's")
  })

  it('getPossessiveFormOfDog({ name: "Monaka" } should return "Monaka\'s")', function () {
    const dog = {
      name: 'Monaka',
    }
    expect(getPossessiveFormOfDog(dog)).to.equal("Monaka's")
  })

  it('getPossessiveFormOfDog({ name: "", sex: "female" }) should return "her"', function () {
    const dog = {
      name: '',
      sex: 'female',
    }
    expect(getPossessiveFormOfDog(dog)).to.equal('her')
  })

  it('getPossessiveFormOfDog({ name: "", sex: "male" }) should return "his"', function () {
    const dog = {
      name: '',
      sex: 'male',
    }
    expect(getPossessiveFormOfDog(dog)).to.equal('his')
  })

  it('getPossessiveFormOfDog({ name: "", sex: "n/a" }) should return "her/his"', function () {
    const dog = {
      name: '',
      sex: 'n/a',
    }
    expect(getPossessiveFormOfDog(dog)).to.equal('her/his')
  })
})

describe('db/types/dog.getObjectiveFormOfDog', function () {
  it('getObjectiveFormOfDog({ name: "pooch" }) should return "pooch"', function () {
    const dog = {
      name: 'pooch',
    }
    expect(getObjectiveFormOfDog(dog)).to.equal('pooch')
  })

  it('getObjectiveFormOfDog({ name: "Monaka" }) should return "Monaka"', function () {
    const dog = {
      name: 'Monaka',
    }
    expect(getObjectiveFormOfDog(dog)).to.equal('Monaka')
  })

  it('getObjectiveFormOfDog({ name: "" }) should return "your dog"', function () {
    const dog = {
      name: '',
    }
    expect(getObjectiveFormOfDog(dog)).to.equal('your dog')
  })
})
