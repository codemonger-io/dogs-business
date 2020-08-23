/**
 * Promisified `Map.loadImage`.
 *
 * @function promiseLoadImage
 *
 * @memberof module:utils/mapbox
 *
 * @param {mapboxgl.Map} map
 *
 *   Mapbox GL JS `Map` that loads an image.
 *
 * @param {string} url
 *
 *   URL of an image to load.
 *
 * @return {Promise<image>}
 *
 *   Promise to be resolved as a loaded image.
 */
export function promiseLoadImage (map, url) {
  return new Promise((resolve, reject) => {
    map.loadImage(url, (error, image) => {
      if (error) {
        reject(error)
      } else {
        resolve(image)
      }
    })
  })
}

export default promiseLoadImage
