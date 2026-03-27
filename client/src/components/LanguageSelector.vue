<script setup lang="ts">
import { BRadioButton } from 'buefy'
import { useI18n } from 'vue-i18n'

import { useSystemConfig } from '../stores/system-config'
import { SUPPORTED_LOCALES } from '../types/system-config'

const systemConfig = useSystemConfig()
const { t } = useI18n()
</script>

<template>
  <div class="field has-addons has-addons-right">
    <b-radio-button
      v-for="locale in SUPPORTED_LOCALES"
      :key="`locale-${locale}`"
      v-model="systemConfig.locale"
      :native-value="locale"
      type="is-info"
    >
      {{ t(`term.locale.${locale}`) }}
    </b-radio-button>
  </div>
</template>
