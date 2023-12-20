<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="container">
    <p>{{ t('message.what_is_the_business_here', [t('term.your_dog_friend')]) }}</p>
  </div>
</template>
