import type { RGB } from '../types/colors'

/** Dog's Business primary color. */
export const DOGS_BUSINESS_PRIMARY = '#37C49F'
/** Dog's Business primary color as {@link RGB}. */
export const DOGS_BUSINESS_PRIMARY_RGB: RGB = hexToRGB(DOGS_BUSINESS_PRIMARY)

/** Dog's Business warning color. */
export const DOGS_BUSINESS_WARNING = '#C4BD37'
/** Dog's Business warning color as {@link RGB}. */
export const DOGS_BUSINESS_WARNING_RGB: RGB = hexToRGB(DOGS_BUSINESS_WARNING)

/** Dog's Business danger color. */
export const DOGS_BUSINESS_DANGER = '#C43F37'
/** Dog's Business danger color as {@link RGB}. */
export const DOGS_BUSINESS_DANGER_RGB: RGB = hexToRGB(DOGS_BUSINESS_DANGER)

/**
 * Converts a givne HEX, e.g., "#123456" into a {@link RGB} representation.
 *
 * @throws RangeError
 *
 *   If `hex` is not a string consisting of a hash (#) followed by 6
 *   hexadecimal digits.
 */
export function hexToRGB(hex: string): RGB {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) {
    throw new RangeError(`invalid hex color: ${hex}`)
  }
  const red = parseInt(match[1], 16) / 255
  const green = parseInt(match[2], 16) / 255
  const blue = parseInt(match[3], 16) / 255
  return { red, green, blue }
}
