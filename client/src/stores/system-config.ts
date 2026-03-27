import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { makeValidatingSerializer } from '../lib/storage-serializer'
import { isSystemConfig } from '../types/system-config'
import type { SupportedLocale } from '../types/system-config'

/**
 * Name of the system config in the local storage.
 *
 * @beta
 */
export const SYSTEM_CONFIG_STORAGE_KEY = 'dogs-business.system-config'

/**
 * Uses the "system-config" Pinia store.
 *
 * @beta
 */
export const useSystemConfig = defineStore('system-config', () => {
  const i18n = useI18n()

  const config = useStorage(
    SYSTEM_CONFIG_STORAGE_KEY,
    { locale: undefined }, // no locale specified by default
    undefined,
    {
      writeDefaults: false,
      serializer: makeValidatingSerializer(isSystemConfig)
    }
  )

  // system locale
  const locale = computed({
    get() {
      return config.value.locale ?? i18n.locale.value
    },
    set(value: SupportedLocale) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useSystemConfig', 'updating locale', value)
      }
      config.value.locale = value
    }
  })

  // syncs vue-i18n whenever the system locale is changed
  watch(
    locale,
    (newLocale, oldLocale) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useSystemConfig', `system locale changed: ${oldLocale} → ${newLocale}`)
      }
      if (newLocale != null) {
        i18n.locale.value = newLocale
      }
    },
    {
      immediate: true
    }
  )

  return {
    config,
    locale
  }
})

/**
 * Reads the system locale from the local storage.
 *
 * @remarks
 *
 * This function is intended to be used during the Vue app initialization.
 *
 * @beta
 */
export function readSystemLocale(): SupportedLocale | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined
  }
  try {
    const rawSystemConfig = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY)
    if (rawSystemConfig == null) {
      return undefined
    }
    const systemConfig =JSON.parse(rawSystemConfig)
    if (!isSystemConfig(systemConfig)) {
      return undefined
    }
    return systemConfig.locale
  } catch (err) {
    console.warn('failed to read system config from local storage:', err)
    return undefined
  }
}
