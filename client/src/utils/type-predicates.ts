/**
 * Makes a type predicate that checks if a given value is an array of a
 * specific type.
 *
 * @beta
 */
export function makeTypePredicateForArrayOf<T>(
  isT: (v: unknown) => v is T
): (v: unknown) => v is T[] {
  return (v: unknown): v is T[] => {
    if (!Array.isArray(v)) {
      return false
    }
    return v.every(isT)
  }
}
