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
    <dog-profile-modal
      ref="dog-profile-modal"
      @saving-dog-profile="onSavingDogProfile"
      @cancelling-dog-profile="onCancellingDogProfile"
    />
  </div>
</template>

<script>
import {
  mapActions,
  mapGetters,
  mapState
} from 'vuex'

import DogProfileModal from '@components/dog-profile-modal'
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
  components: {
    DogProfileModal,
    MapPane,
    NavigationBar
  },
  mixins: [
    ReleaseEventListenerOnDestroy
  ],
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
    // shows a dog profile modal if no dog is registered
    this.promiseLoaded()
      .then(() => {
        if (this.dogCount === 0) {
          this.showDogProfileModal({
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
    showDogProfileModal (settings) {
      this.$refs['dog-profile-modal'].show(settings)
    },
    hideDogProfileModal () {
      this.$refs['dog-profile-modal'].hide()
    },
    onSavingDogProfile ({ isNewDog, dog }) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('saving dog profile', `isNewDog=${isNewDog}`, dog)
      }
      let promiseUpdated
      if (isNewDog) {
        promiseUpdated = this.appendDog(dog)
      } else {
        promiseUpdated = this.updateDog(dog)
      }
      promiseUpdated
        .catch(err => console.error(err))
        .finally(() => this.hideDogProfileModal())
    },
    onCancellingDogProfile () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('cancelling dog profile')
      }
      this.hideDogProfileModal()
    },
    editDogProfile () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('App', 'editing dog profile')
      }
      this.showDogProfileModal({
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
