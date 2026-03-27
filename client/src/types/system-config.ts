/**
 * Supported locales.
 *
 * @beta
 */
export const SUPPORTED_LOCALES = ['en', 'ja'] as const

/**
 * Type representing a supported locale.
 *
 * @beta
 */
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

/**
 * System config.
 *
 * @beta
 */
export interface SystemConfig {
  /**
   * Supported locale.
   *
   * `undefined` if not chosen yet.
   */
  locale?: SupportedLocale
}

/**
 * Returns if a given value is a {@link SystemConfig}.
 *
 * @beta
 */
export function isSystemConfig(value: unknown): value is SystemConfig {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const systemConfig = value as SystemConfig
  if (
    systemConfig.locale != null
    && SUPPORTED_LOCALES.indexOf(systemConfig.locale) === -1
  ) {
    return false
  }
  return true
}
