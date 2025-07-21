/**
 * A serializer for {@link https://vueuse.org/core/useStorage/|useStorage} that
 * validates a value with a given type predicate.
 */
export function makeValidatingSerializer<T>(predicate: (value: unknown) => value is T) {
  return {
    read: (raw: string) => {
      const value = JSON.parse(raw)
      if (!predicate(value)) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('makeValidatingSerializer', 'corrupted stored value', value)
        }
        throw new Error('corrupted stored value')
      }
      return value
    },
    write: (value: T) => JSON.stringify(value)
  }
}
