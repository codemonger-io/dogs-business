/**
 * Augments `@types/mapbox-gl`.
 *
 * Reference: https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 */

// if `Marker` is specifically imported, ESLint complains about unused import
// if we omit the next line, the entire `mapbox-gl` module is overwritten
import 'mapbox-gl'

declare module 'mapbox-gl' {
  interface Marker {
    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker#addclassname
    addClassName(className: string): this
    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker#removeclassname
    removeClassName(className: string): this
    // https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker#toggleclassname
    toggleClassName(className: string): boolean
  }
}
