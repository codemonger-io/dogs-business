<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const functionalities = [
  {
    name: t('term.feature.viewing_map'),
    signup: true,
    woSignup: true
  },
  {
    name: t('term.feature.putting_own_droppings'),
    signup: true,
    woSignup: true
  },
  {
    name: t('term.feature.viewing_droppings_of_other_dogs'),
    signup: true,
    woSignup: false
  },
  {
    name: t('term.feature.showing_off_own_droppings'),
    signup: true,
    woSignup: false
  }
] as const

const enabled = '✅'
const disabled = '-'
</script>

<template>
  <div class="card paper functionalities">
    <div class="card-content">
      <b-table :data="functionalities" bordered striped>
        <b-table-column
          field="name"
          :label="t('term.functionality', 1)"
          v-slot="props"
        >
          {{ props.row.name }}
        </b-table-column>
        <b-table-column
          field="signup"
          :label="t('term.signup')"
          v-slot="props"
          centered
        >
          {{ props.row.signup ? enabled : disabled }}
        </b-table-column>
        <b-table-column
          field="woSignup"
          :label="t('term.without_signup')"
          v-slot="props"
          centered
        >
          {{ props.row.woSignup ? enabled : disabled }}
        </b-table-column>
      </b-table>
    </div>
  </div>
</template>
