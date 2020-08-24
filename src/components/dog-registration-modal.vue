<template>
  <div
    class="modal"
    :class="modalClass"
  >
    <div class="modal-background" />
    <div class="modal-card">
      <header class="modal-card-head">
        Tell us about your dog
      </header>
      <section class="modal-card-body">
        <b-field label="Name">
          <b-input
            v-model="newDog.name"
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
              v-model="newDog.sex"
              name="sex"
              native-value="female"
            >
              <b-icon
                icon="gender-female"
                size="is-small"
              />
            </b-radio>
            <b-radio
              v-model="newDog.sex"
              name="sex"
              native-value="male"
            >
              <b-icon
                icon="gender-male"
                size="is-small"
              />
            </b-radio>
            <b-radio
              v-model="newDog.sex"
              name="sex"
              native-value="n/a"
            >
              Do not care
            </b-radio>
          </div>
        </div>
        <b-field label="Date of birth">
          <b-checkbox
            v-model="newDog.omitsDateOfBirth"
          >
            Do not care
          </b-checkbox>
          <b-datepicker
            v-model="newDog.dateOfBirth"
            placeholder="Select a date"
            icon="calendar-today"
            :disabled="newDog.omitsDateOfBirth"
          />
        </b-field>
        <p class="hint-message">
          By filling the fields shown above, some messages from this application are customized.
          But you may omit any or all of them.
        </p>
      </section>
      <footer class="modal-card-foot modal-card-foot-pulled-right">
        <button
          class="button is-primary"
          @click="onRegisterClicked"
        >
          Register
        </button>
        <button
          class="button"
          @click="onOmitClicked"
        >
          Omit
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
/**
 * Modal to register a dog.
 *
 * @namespace DogRegistrationModal
 *
 * @memberof module:components
 *
 * @vue-event {object} registering-dog
 *
 *   If the user is going to register a dog.
 *   An argument has the following fields,
 *   - `name`: {`string`} name of the dog.
 *   - `sex`: {`string`}
 *     sex of the dog. 'female', 'male' or 'n/a'.
 *   - `dateOfBirth`: {`Date`}
 *     Date of birth (DoB) of the dog.
 *     `null` if no DoB is given.
 *
 * @vue-event {nothing} registration-omitted
 *
 *   If the user omits registration of a dog.
 */
export default {
  name: 'DogRegistrationModal',
  data () {
    return {
      isActive: false,
      newDog: {
        name: '',
        sex: 'n/a',
        omitsDateOfBirth: true,
        dateOfBirth: new Date()
      }
    }
  },
  computed: {
    modalClass () {
      return {
        'is-active': this.isActive
      }
    }
  },
  methods: {
    /**
     * Shows this dog registration modal.
     *
     * @function show
     *
     * @memberof module:components/DogRegistrationModal
     */
    show () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('showing dog registration modal')
      }
      this.isActive = true
    },
    /**
     * Hides this dog registration modal.
     *
     * @function hide
     *
     * @memberof module:components/DogRegistrationModal
     */
    hide () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('hiding dog registration modal')
      }
      this.isActive = false
    },
    onRegisterClicked () {
      const {
        name,
        sex,
        omitsDateOfBirth,
        dateOfBirth
      } = this.newDog
      this.$emit('registering-dog', {
        name,
        sex,
        dateOfBirth: omitsDateOfBirth ? null : dateOfBirth
      })
    },
    onOmitClicked () {
      this.$emit('registration-omitted')
    }
  }
}
</script>

<style lang="scss" scoped>
.modal-card-foot-pulled-right {
  justify-content: flex-end;
  justify-items: flex-end;
}

.hint-message {
  margin-top: 2em;
}
</style>
