/**
 * Vue mixin that releases event listeners on destroy.
 *
 * @namespace ReleaseEventListenerOnDestroy
 *
 * @memberof module:components/mixins
 *
 * @vue-data {array<object>} eventListeners
 *
 *   Registered event listeners to be released on destroy.
 *   Each element has the following fields,
 *   - `target`: {`object`} target to listen to.
 *   - `type`: {`string`} event type to listen for.
 *   - `listener`: {`function`} event listener.
 *   - `addEventListener`: {`function`} adds an event listener.
 *   - `removeEventListener`: {`function`} removes an event listener.
 */
export const ReleaseEventListenerOnDestroy = {
  data () {
    return {
      eventListeners: [],
    }
  },
  /**
   * Releases registered event listeners.
   *
   * @function beforeUnmount
   *
   * @instance
   *
   * @memberof module:components/mixins.ReleaseEventListenerOnDestroy
   */
  beforeUnmount () {
    this.eventListeners.forEach(entry => {
      const {
        target,
        type,
        listener,
        removeEventListener,
      } = entry
      removeEventListener(target, type, listener)
    })
  },
  methods: {
    /**
     * Registers an event listener.
     *
     * An event listener registered by this function will be released on
     * [beforeUnmount]{@linkcode module:components/mixins.ReleaseEventListenerOnDestroy#beforeDestroy}.
     *
     * @function registerEventListener
     *
     * @instance
     *
     * @param {`object`} target
     *
     *   Target to listen to.
     *
     * @param {`string`} type
     *
     *   Event type to listen for.
     *
     * @param {`function`} listener
     *
     *   Event listener.
     *
     * @param {`object`} options
     *
     *   Options that may be omitted.
     *   May have the following fields,
     *   - `addEventListener`: {`function(target, type, listener)`}
     *     Function that is called to listen to `target`.
     *     Calls `target['addEventListener'](type, listener)` by default.
     *   - `removeEventListener`: {`function(target, type, listener)`}
     *     Function that is called to remove a listener from `target`.
     *     Calls `target['removeEventListener'](type, listener)` by default.
     */
    registerEventListener (target, type, listener, options) {
      options = options || {}
      options = {
        addEventListener(target, type, listener) {
          target['addEventListener'](type, listener)
        },
        removeEventListener(target, type, listener) {
          target['removeEventListener'](type, listener)
        },
        ...options,
      }
      const {
        addEventListener,
        removeEventListener,
      } = options
      addEventListener(target, type, listener)
      this.eventListeners.push({
        target,
        type,
        listener,
        addEventListener,
        removeEventListener,
      })
    },
  },
}

export default ReleaseEventListenerOnDestroy
