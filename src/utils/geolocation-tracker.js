/**
 * Provides a geolocation tracking utility.
 *
 * @module utils/geolocation-tracker
 */

// I got "TypeError: Reflect.construct requires the first argument be a constructor" without this import.
import { EventTarget } from 'event-target-shim'

/**
 * Geolocation tracker.
 *
 * @class GeolocationTracker
 *
 * @extends EventTarget
 *
 * @param {object} options
 *
 *   Options for geolocation tracking.
 *   May have the following field in addition to those of
 *   [PositionOptions]{@linkcode https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions},
 *   - `retryCount`: {`number`}
 *     Number of retries to request a location.
 *     `3` by default.
 *
 * @throws {RangeError}
 *
 *   If `options.retryCount <= 0`.
 */
export class GeolocationTracker extends EventTarget {
  // options for geolocation tracking.
  #options
  // location watcher ID.
  // `undefined` if no location watcher is active.
  #watcherId

  constructor (options) {
    if (options.retryCount <= 0) {
      throw new RangeError(`options.retryCount must be > 0 but ${options.retryCount} was given`)
    }
    super()
    this.#options = {
      retryCount: 3,
      ...options,
    }
    this.#watcherId = undefined
  }

  /**
   * Requests the current location.
   *
   * @function getCurrentPosition
   *
   * @instance
   *
   * @memberof module:utils/geolocation-tracker.GeolocationTracker
   *
   * @return {Promise<GeolocationPosition>}
   *
   *   Resolves to a [GeolocationPosition]{@linkcode https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPosition}
   *   when a geolocation is successfully obtained.
   *   Rejected with a [GeolocationPositionError]{@linkcode https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError}
   *   when a geolocation could not be obtained after retrying.
   */
  getCurrentPosition () {
    let { retryCount } = this.#options
    return new Promise((resolve, reject) => {
      const request = () => {
        navigator.geolocation.getCurrentPosition(
          // success
          resolve,
          // error
          err => {
            --retryCount
            if (retryCount > 0) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('failed to request the location, retrying...')
              }
              request()
            } else {
              reject(err)
            }
          },
          // options
          this.#options,
        )
      }
      request()
    })
  }

  /**
   * Starts tracking the current location.
   *
   * Has no effect if it is already tracking the location.
   *
   * @function startTracking
   *
   * @instance
   *
   * @memberof module:utils/geolocation-tracker.GeolocationTracker
   */
  startTracking () {
    if (this.#watcherId !== undefined) {
      console.warn(`location tracking is active. stop tracking first.`)
      return
    }
    this.#watcherId = navigator.geolocation.watchPosition(
      // success
      position => {
        /**
         * Notified when the location is updated.
         *
         * @event module:utils/geolocation-tracker.GeolocationTracker#location-updated
         */
        const event = new Event('location-updated')
        event.position = position
        this.dispatchEvent(event)
      },
      // error
      err => {
        /**
         * Notified when location tracking has failed.
         *
         * @event module:utils/geolocation-tracker.GeolocationTracker#location-error
         */
        const event = new Event('location-error')
        event.error = err
        this.dispatchEvent(event)
      },
      // options
      this.#options,
    )
    /**
     * Notified when location tracking has started.
     *
     * @event module:utils/geolocation-tracker.GeolocationTracker#tracking-started
     */
    this.dispatchEvent(new Event('tracking-started'))
  }

  /**
   * Stops tracking the current location.
   *
   * Has no effect if location tracking is not active.
   *
   * @function stopTracking
   *
   * @instance
   *
   * @memberof module:utils/geolocation-tracker.GeolocationTracker
   */
  stopTracking () {
    if (this.#watcherId === undefined) {
      console.warn('location tracking is not active. start tracking first.')
    }
    navigator.geolocation.clearWatch(this.#watcherId)
    this.#watcherId = undefined
    /**
     * Notified when location tracking has stopped.
     *
     * @event module:utils/geolocation-tracker.GeolocationTracker
     */
    this.dispatchEvent(new Event('tracking-stopped'))
  }
}

export default GeolocationTracker
