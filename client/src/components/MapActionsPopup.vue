<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { capitalize } from '../utils/strings'
import IconPee from './icons/IconPee.vue'
import IconPoo from './icons/IconPoo.vue'

const { t } = useI18n()

const emit = defineEmits<{
  pee: [],
  poo: []
}>()
</script>

<template>
  <div class="container">
    <p>
      {{ t('message.what_is_the_business_here', [t('term.your_dog_friend')]) }}
    </p>
    <div class="block is-flex is-justify-content-center">
      <div class="action-item">
        <b-tooltip :label="capitalize(t('term.pee'))" type="is-info">
          <button
            class="button poo-button is-rounded is-circle-icon"
            @click="emit('pee')"
          >
            <span class="icon">
              <IconPee />
            </span>
          </button>
        </b-tooltip>
      </div>
      <div class="action-item">
        <b-tooltip :label="capitalize(t('term.poo'))" type="is-info">
          <button
            class="button poo-button is-rounded is-circle-icon"
            @click="emit('poo')"
          >
            <span class="icon">
              <IconPoo />
            </span>
          </button>
        </b-tooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-item {
  &:not(:last-child) {
    margin-right: 1.5rem;
  }
}
</style>
