/**
 * Defines a date type.
 *
 * @module db.types.date
 */

/**
 * Returns a string form of a given `Date`.
 *
 * @function formatDate
 *
 * @param {Date} date
 *
 *   Date to be formatted.
 *
 * @return {string}
 *
 *   String form of `date`.
 *   `YYYY-MM-DD` form.
 */
export function formatDate (date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // starts from 0
  const day = date.getDate()
  const yyyy = ('' + year).padStart(4, '0')
  const mm = ('' + month).padStart(2, '0')
  const dd = ('' + day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
