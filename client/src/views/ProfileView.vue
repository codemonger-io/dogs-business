<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { capitalize } from '../utils/strings'

const router = useRouter()
const { t } = useI18n()

const dogName = ref('')

const close = () => {
  router.push({ name: 'map' })
}

const onSubmit = () => {
  console.log('creating new dog profile for', dogName.value)
  close()
}
</script>

<template>
  <div class="container is-max-desktop">
    <b-modal
      custom-class="is-full-screen-mobile"
      :model-value="true"
      @cancel="close"
    >
      <div class="card paper">
        <div class="card-content">
          <section class="section">
            <h1 class="title is-3">{{ capitalize(t('term.new_profile')) }}</h1>
            <div class="block">
              <p class="block">{{ t('message.tell_us_about_your_dog_friend') }}</p>
              <form @submit.prevent="onSubmit">
                <b-field label-position="on-border">
                  <template #label>
                    <b-tooltip
                      type="is-info"
                      :label="t('tooltip.dog_friend_name')"
                      append-to-body
                      multilined
                    >
                      <span class="is-inline-block">
                        {{ capitalize(t('term.dog_friend_name')) }}
                      </span>
                    </b-tooltip>
                  </template>
                  <b-input
                    v-model="dogName"
                    :placeholder="t('placeholder.dog_friend_name')"
                  ></b-input>
                </b-field>
                <p class="is-flex is-justify-content-center">
                  <input
                    class="button is-primary"
                    type="submit"
                    :value="t('message.register_profile')"
                  >
                </p>
              </form>
            </div>
            <div class="block">
              <p>
                <a href="#">
                  &#x1F91D;{{ t('message.do_you_want_to_be_a_friend_of_other_dog') }}
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </b-modal>
  </div>
</template>
