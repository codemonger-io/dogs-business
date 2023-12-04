<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const TermsOfService = computed(() => defineAsyncComponent(() =>
  import(`../i18n/terms-of-service.${locale.value.toLowerCase()}.md`)
))
</script>

<template>
  <div class="card paper">
    <div class="card-content content">
      <component :is="TermsOfService" />
    </div>
  </div>
</template>
