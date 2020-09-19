/**
 * Provides a random ID generator utility.
 *
 * @module utils/random-id
 */

/**
 * Generates a random ID string.
 *
 * @function makeRandomId
 *
 * @static
 *
 * @return {string}
 *
 *   Random ID string of 16 characters.
 *   Each character is ranged from '0' to '9', and from 'a' to 'f'.
 *
 * @throws {TypeError}
 *
 *   If `window.crypto` is not defined.
 */
export function makeRandomId () {
  const buffer = new Uint8Array(8)
  window.crypto.getRandomValues(buffer)
  // Uint8Array#map cannot be used because it returns a Uint8Array.
  function toHex (x) {
    return x.toString(16).padStart(2, '0')
  }
  return Array.prototype.map.call(buffer, toHex).join('')
}
