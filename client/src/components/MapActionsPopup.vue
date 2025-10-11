<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { GenericDog } from '../lib/dog-database'
import { capitalize } from '../utils/strings'
import IconPee from './icons/IconPee.vue'
import IconPoo from './icons/IconPoo.vue'

const { t } = useI18n()

const props = defineProps<{ dog: GenericDog }>()

const emit = defineEmits<{
  pee: [],
  poo: []
}>()

const dogName = computed(() => {
  return props.dog.name || t('term.your_dog_friend')
})
</script>

<template>
  <div class="container">
    <p>
      {{ t('message.what_is_the_business_here', [dogName]) }}
    </p>
    <div class="block is-flex is-justify-content-center">
      <div class="action-item">
        <button
          class="button poo-button is-rounded is-circle-icon"
          @click="emit('pee')"
        >
          <span class="icon">
            <IconPee />
          </span>
        </button>
      </div>
      <div class="action-item">
        <button
          class="button poo-button is-rounded is-circle-icon"
          @click="emit('poo')"
        >
          <span class="icon">
            <IconPoo />
          </span>
        </button>
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
