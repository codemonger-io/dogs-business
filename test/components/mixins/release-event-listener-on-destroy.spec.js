import chai from '@test/setup-chai'
import sinon from 'sinon'
import { mount } from '@vue/test-utils'

import ReleaseEventListenerOnDestroy from '@components/mixins/release-event-listener-on-destroy'

const { expect } = chai

describe('ReleaseEventListenerOnDestroy', function () {
  const listener = () => {}
  let target

  beforeEach(function () {
    target = {
      addEventListener () {},
      removeEventListener () {},
    }
    sinon.spy(target)
  })

  describe('#registerEventListener(target, "resize", listener)', function () {
    let wrapper

    const TestComponent = {
      template: '<div />',
      mixins: [
        ReleaseEventListenerOnDestroy,
      ],
      mounted () {
        this.registerEventListener(target, 'resize', listener)
      },
    }

    beforeEach(function () {
      wrapper = mount(TestComponent)
    })

    it('should invoke target.addEventListener("resize", listener)', function () {
      expect(target.addEventListener.withArgs('resize', listener)).to.have.been.calledOnce
      // expect(target.addEventListener).to.have.been.calledWith('resize', listener)
    })

    it('should not invoke target.removeEventListener', function () {
      expect(target.removeEventListener).not.to.have.been.called
    })

    describe('after destroying', function () {
      beforeEach(function () {
        wrapper.unmount()
      })

      it('target.removeEventListener("resize", listener) should have been invoked', function () {
        expect(target.removeEventListener.withArgs('resize', listener)).to.have.been.calledOnce
      })
    })

    describe('#registerEventListener(target, "scroll", listener2)', function () {
      const listener2 = () => {}

      beforeEach(function () {
        wrapper.vm.registerEventListener(target, 'scroll', listener2)
      })

      it('should invoke target.addEventListener("scroll", listener2)', function () {
        expect(target.addEventListener.withArgs('scroll', listener2)).to.have.been.calledOnce
      })

      it('should not invoke target.removeEventListener', function () {
        expect(target.removeEventListener).not.to.have.been.called
      })

      describe('after destroying', function () {
        beforeEach(function () {
          wrapper.unmount()
        })

        it('target.removeEventListener with ("resize", listener) and ("scroll", listener2) should have been invoked', function () {
          expect(target.removeEventListener.withArgs('resize', listener)).to.have.been.calledOnce
          expect(target.removeEventListener.withArgs('scroll', listener2)).to.have.been.calledOnce
        })
      })
    })
  })

  describe('#registerEventListener(target, "notification", listener, { addEventListener: customHandler })', function () {
    let customHandler
    let wrapper

    const TestComponent = {
      template: '<div />',
      mixins: [
        ReleaseEventListenerOnDestroy,
      ],
      mounted () {
        const options = {
          addEventListener: customHandler,
        }
        this.registerEventListener(target, 'notification', listener, options)
      },
    }

    beforeEach(function () {
      customHandler = sinon.spy()
      wrapper = mount(TestComponent)
    })

    it('should invoke customHandler(target, "notification", listener)', function () {
      expect(customHandler.withArgs(target, 'notification', listener)).to.have.been.calledOnce
    })

    it('should not invoke target.addEventListener', function () {
      expect(target.addEventListener).not.to.have.been.called
    })

    describe('after destroying', function () {
      beforeEach(function () {
        wrapper.unmount()
      })

      it('target.removeEventListener("notification", listener) should have been invoked', function () {
        expect(target.removeEventListener.withArgs('notification', listener)).to.have.been.calledOnce
      })
    })
  })

  describe('#registerEventListener(target, "notification", listener, { removeEventListener: customHandler })', function () {
    let customHandler
    let wrapper

    const TestComponent = {
      template: '<div />',
      mixins: [
        ReleaseEventListenerOnDestroy,
      ],
      mounted () {
        const options = {
          removeEventListener: customHandler,
        }
        this.registerEventListener(target, 'notification', listener, options)
      },
    }

    beforeEach(function () {
      customHandler = sinon.spy()
      wrapper = mount(TestComponent)
    })

    it('should invoke target.addEventListener("notification", listener)', function () {
      expect(target.addEventListener.withArgs('notification', listener)).to.have.been.calledOnce
    })

    describe('after destroying', function () {
      beforeEach(function () {
        wrapper.unmount()
      })

      it('customHandler(target, "notification", listener) should have been invoked', function () {
        expect(customHandler.withArgs(target, 'notification', listener)).to.have.been.calledOnce
      })

      it('target.removeEventListener should not have been invoked', function () {
        expect(target.removeEventListener).not.to.have.been.called
      })
    })
  })
})
