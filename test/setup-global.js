// vue-test-utils needs jsdom
require('jsdom-global')()

// defines window.crypto for testing.
// only getRandomValues is defined so far.
window.crypto = {
  // this implementation is not cryptographically safe at all.
  // NEVER USE for production.
  getRandomValues (buf) {
    // wrapping `buf` with `Uint8Array` simplifies the problem.
    const buf8 = new Uint8Array(buf.buffer)
    for (let i = 0; i < buf8.length; ++i) {
      buf8[i] = Math.floor(256 * Math.random())
    }
  },
}

// get "ReferenceError: SVGElement is not defined" otherwise
// https://github.com/vuejs/vue-next/issues/3590
global.SVGElement = window.SVGElement
