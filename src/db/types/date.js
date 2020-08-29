/**
 * Defines a date type.
 *
 * @module db/types/date
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
 *
 * @throws {RangeError}
 *
 *   If `date` is invalid.
 */
export function formatDate (date) {
  const year = date.getFullYear()
  // makes sure that `date` is valid
  // http://www.ecma-international.org/ecma-262/6.0/#sec-date.prototype.getfullyear
  if (Number.isNaN(year)) {
    throw new RangeError('invalid date cannot be formatted')
  }
  const month = date.getMonth() + 1 // starts from 0
  const day = date.getDate()
  const yyyy = ('' + year).padStart(4, '0')
  const mm = ('' + month).padStart(2, '0')
  const dd = ('' + day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
