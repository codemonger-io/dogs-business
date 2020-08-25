/**
 * Manages IndexedDB.
 *
 * @module indexed-db
 */

import Database from './database'

/**
 * Opens an IndexedDB.
 *
 * @function openDatabase
 *
 * @return {Database}
 *
 *   Loaded database.
 */
export function openDatabase () {
  return new Database()
}
