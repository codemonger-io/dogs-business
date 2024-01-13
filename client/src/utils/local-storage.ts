/**
 * Checks if the browser supports the local storage.
 *
 * @remarks
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#testing_for_availability
 */
export function isLocalStorageSupported(): boolean {
  try {
    const x = '__storage_test__'
    window.localStorage.setItem(x, x)
    window.localStorage.removeItem(x)
    return true
  } catch (err) {
    console.error('isLocalStorageSupported', err)
    return false
  }
}
