<template>
  <div
    class="modal"
    :class="modalClass"
  >
    <div class="modal-background" />
    <div class="modal-card">
      <header class="modal-card-head">
        Tell me about your dog
      </header>
      <section class="modal-card-body">
        <b-field label="Name">
          <b-input
            v-model="dog.name"
            placeholder="Type your dog's name"
          />
        </b-field>
        <div class="field">
          <label
            class="label"
            for="new-dog-sex"
          >
            Sex
          </label>
          <div
            id="new-dog-sex"
            class="block"
          >
            <b-radio
              v-model="dog.sex"
              name="sex"
              native-value="female"
            >
              <b-icon
                icon="gender-female"
                size="is-small"
              />
            </b-radio>
            <b-radio
              v-model="dog.sex"
              name="sex"
              native-value="male"
            >
              <b-icon
                icon="gender-male"
                size="is-small"
              />
            </b-radio>
            <b-radio
              v-model="dog.sex"
              name="sex"
              native-value="n/a"
            >
              Do not care
            </b-radio>
          </div>
        </div>
        <b-field label="Date of birth">
          <b-checkbox
            v-model="dog.omitsDateOfBirth"
          >
            Do not care
          </b-checkbox>
          <b-datepicker
            v-model="dog.dateOfBirth"
            placeholder="Select a date"
            icon="calendar-today"
            :disabled="dog.omitsDateOfBirth"
          />
        </b-field>
        <p class="hint-message">
          By filling the fields shown above, some messages from this application are customized.
          But you may omit any or all of them.
        </p>
      </section>
      <footer class="modal-card-foot modal-card-foot-pulled-right">
        <button
          class="button modal-button"
          @click="onCancelClicked"
        >
          {{ cancelButtonTitle }}
        </button>
        <button
          class="button modal-button is-primary"
          @click="onSaveClicked"
        >
          {{ saveButtonTitle }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import { formatDate } from '@db/types/date'

/**
 * Modal to register or update a dog.
 *
 * @namespace DogProfileModal
 *
 * @memberof module:components
 *
 * @vue-event {object} saving-dog-profile
 *
 *   If the user is going to save a dog profile.
 *   An argument has the following fields,
 *   - `isNewDog`: {`boolean`} whether a new dog is to be registered.
 *   - `dog`: {{@linkcode module:db/types/dog.Dog}}
 *     New dog profile to be saved.
 *     `dogId` is `undefined` if `isNewDog` is `true`.
 *
 * @vue-event {nothing} cancelling-dog-profile
 *
 *   If the user cancels editing a dog profile.
 */
export default {
  name: 'DogProfileModal',
  emits: ['cancelling-dog-profile', 'saving-dog-profile'],
  data () {
    return {
      isActive: false,
      isNewDog: true,
      dog: {
        name: '',
        sex: 'n/a',
        omitsDateOfBirth: true,
        dateOfBirth: new Date(),
      },
    }
  },
  computed: {
    modalClass () {
      return {
        'is-active': this.isActive,
      }
    },
    saveButtonTitle () {
      return this.isNewDog ? 'Register' : 'Save'
    },
    cancelButtonTitle () {
      return this.isNewDog ? 'Omit' : 'Cancel'
    },
  },
  methods: {
    /**
     * Shows this dog profile modal.
     *
     * @function show
     *
     * @memberof module:components.DogProfileModal
     *
     * @param {object} settings
     *
     *   Settings for the dog profile modal.
     *   Has the following fields,
     *   - `isNewDog`: {`boolean`} whether a new dog is to be registered.
     *   - `dog`: {{@linkcode module:db/types/dog.Dog}}
     *     Dog to edit.
     *     Ignored `isNewDog` is `false`.
     */
    show (settings) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('showing dog profile modal', settings)
      }
      this.isNewDog = settings.isNewDog
      if (this.isNewDog) {
        this.dog = {
          name: '',
          sex: 'n/a',
          omitsDateOfBirth: true,
          dateOfBirth: new Date(),
        }
      } else {
        const {
          dogId,
          name,
          sex,
          dateOfBirth,
        } = settings.dog
        this.dog = {
          dogId,
          name,
          sex,
          omitsDateOfBirth: dateOfBirth === undefined,
          dateOfBirth: (dateOfBirth === undefined) ? new Date() : new Date(dateOfBirth),
        }
      }
      this.isActive = true
    },
    /**
     * Hides this dog profile modal.
     *
     * @function hide
     *
     * @memberof module:components.DogProfileModal
     */
    hide () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('hiding dog profile modal')
      }
      this.isActive = false
    },
    onSaveClicked () {
      const {
        dogId,
        name,
        sex,
        omitsDateOfBirth,
        dateOfBirth,
      } = this.dog
      this.$emit('saving-dog-profile', {
        isNewDog: this.isNewDog,
        dog: {
          dogId,
          name,
          sex,
          dateOfBirth: omitsDateOfBirth ? undefined : formatDate(dateOfBirth),
        },
      })
    },
    onCancelClicked () {
      this.$emit('cancelling-dog-profile')
    },
  },
}
</script>

<style lang="scss" scoped>
.hint-message {
  margin-top: 2em;
}
</style>
