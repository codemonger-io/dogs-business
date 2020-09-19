<template>
  <div ref="app">
    <navigation-bar
      @editing-dog-profile="editDogProfile"
    />
    <div
      ref="map-container"
      class="map-container"
    >
      <map-pane
        ref="map-pane"
        :resize-trigger="resizeTrigger"
      />
    </div>
    <dog-registration-modal
      ref="dog-registration-modal"
      @registering-dog="onRegisteringDog"
      @registration-omitted="onRegistrationOmitted"
    />
  </div>
</template>

<script>
import {
  mapActions,
  mapGetters,
  mapState
} from 'vuex'

import DogRegistrationModal from '@components/dog-registration-modal'
import MapPane from '@components/map-pane'
import NavigationBar from '@components/navigation-bar'
import ReleaseEventListenerOnDestroy from '@components/mixins/release-event-listener-on-destroy'

/**
 * Application component.
 *
 * @namespace App
 *
 * @memberof module:components
 */
export default {
  name: 'App',
  mixins: [
    ReleaseEventListenerOnDestroy
  ],
  components: {
    DogRegistrationModal,
    MapPane,
    NavigationBar
  },
  data () {
    return {
      resizeTrigger: 0
    }
  },
  computed: {
    ...mapState('user', [
      'dogs',
      'isLoaded'
    ]),
    ...mapGetters('user', [
      'dogCount'
    ]),
    // current dog.
    // `undefined` if no dog is registered.
    currentDog () {
      // TODO: support multiple dogs
      return this.dogs[0]
    }
  },
  mounted () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('App', 'mounted')
    }
    // makes the map exactly fill the window.
    // this is necessary because `100vh` may include the height of
    // a navigation bar on a mobile device.
    this.resizeMapContainer()
    this.registerEventListener(window, 'resize', () => {
      this.resizeMapContainer()
    })
    // shows a dog registration modal if no dog is registered
    this.promiseLoaded()
      .then(() => {
        if (this.dogCount === 0) {
          this.showDogRegistrationModal({
            isNewDog: true
          })
        }
      })
  },
  methods: {
    ...mapActions('user', [
      'appendDog',
      'updateDog'
    ]),
    promiseLoaded () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('waiting for data loaded', this.isLoaded)
      }
      if (this.isLoaded) {
        return Promise.resolve(true)
      } else {
        // waits until `isLoaded` turns into true
        // makes sure unwatching `isLoaded`
        let unwatch
        return new Promise(resolve => {
          unwatch = this.$watch('isLoaded', isLoaded => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('data loaded', isLoaded)
            }
            resolve(isLoaded)
          })
        })
          .finally(unwatch)
      }
    },
    resizeMapContainer () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('resizing the map container')
      }
      const mapContainer = this.$refs['map-container']
      const { top } = mapContainer.getBoundingClientRect()
      const { innerHeight } = window
      const containerHeight = innerHeight - top
      mapContainer.style.height = `${containerHeight}px`
      // resizes subsequent components
      ++this.resizeTrigger
    },
    showDogRegistrationModal (settings) {
      this.$refs['dog-registration-modal'].show(settings)
    },
    hideDogRegistrationModal () {
      this.$refs['dog-registration-modal'].hide()
    },
    onRegisteringDog ({ isNewDog, dog }) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('registering dog', `isNewDog=${isNewDog}`, dog)
      }
      let promiseUpdated
      if (isNewDog) {
        promiseUpdated = this.appendDog(dog)
      } else {
        promiseUpdated = this.updateDog(dog)
      }
      promiseUpdated
        .catch(err => console.error(err))
        .finally(() => this.hideDogRegistrationModal())
    },
    onRegistrationOmitted () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('registration omitted')
      }
      this.hideDogRegistrationModal()
    },
    editDogProfile () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('App', 'editing dog profile')
      }
      this.showDogRegistrationModal({
        isNewDog: false,
        dog: this.currentDog
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.map-container {
  width: 100vw;
  height: 100vh;
}
</style>
