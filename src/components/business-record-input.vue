<template>
  <div>
    <p>What is {{ possessiveFormOfDog }} business here?</p>
    <div class="level is-mobile">
      <p class="level-item">
        <button
          class="button circle-button"
          @click="onBusinessTypeClicked('pee')"
        >
          <span class="icon">
            <img
              class="image is-24x24"
              src="@assets/images/pee.png"
            />
          </span>
        </button>
      </p>
      <p class="level-item">
        <button
          class="button circle-button"
          @click="onBusinessTypeClicked('poo')"
        >
          <span class="icon">
            <img
              class="image is-24x24"
              src="@assets/images/poo.png"
            />
          </span>
        </button>
      </p>
    </div>
  </div>
</template>

<script>
import {
  getPossessiveFormOfDog
} from '@db/types/dog'

/**
 * Component that provides an interface for inputting a business record.
 *
 * @namespace BusinessRecordInput
 *
 * @memberof module:components
 *
 * @vue-prop {Object} dog
 *
 *   Information of the dog whose business is to be inputted.
 *
 * @vue-event {string} adding-business-record
 *
 *   Notified when the user selects a business type to record.
 */
export default {
  name: 'BusinessRecordInput',
  props: {
    dog: {
      type: Object,
      required: true
    }
  },
  computed: {
    possessiveFormOfDog () {
      return getPossessiveFormOfDog(this.dog)
    }
  },
  methods: {
    onBusinessTypeClicked (type) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordInput', 'businessTypeClicked', type)
      }
      this.$emit('adding-business-record', type)
    }
  }
}
</script>
