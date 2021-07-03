import EXTENT from 'maplibre-gl/src/data/extent'

/**
 * Viewport padding included in a collision box.
 *
 * According to https://github.com/mapbox/mapbox-gl-js/blob/38f0072d4dd8122b1f12337468c592cc60938e2c/src/symbol/collision_index.js#L28
 *
 * @member {number} VIEWPORT_PADDING
 *
 * @static
 *
 * @memberof module:utils/mapbox
 */
export const VIEWPORT_PADDING = 100

/**
 * Collects collision boxes and features of a given source.
 *
 * Symbols with icon are supposed so far.
 *
 * This function returns a `Promise` because the placement of symbols currently
 * running may not be done; i.e., `placement.stale === true`.
 *
 * **Depends on the internal structure of Mapbox Map instance.**
 *
 * @function collectCollisionBoxesAndFeatures
 *
 * @static
 *
 * @memberof module:utils/mapbox
 *
 * @param {mapbox.Map} map
 *
 *   Map instance.
 *
 * @param {string} sourceName
 *
 *   Name of the source where collision boxes and features are to be collected.
 *
 * @return {Promise< array<object> >}
 *
 *   Resolves to collected collision boxes when the placement of symbols
 *   currently running is done.
 *   Each element has the following fields,
 *   - `collisionBox`: {`object`}
 *     Collision box projected to the viewport.
 *     Has the following fields,
 *     - `x1`: {`number`} x-coordinate of the top-left corner of the box.
 *     - `y1`: {`number`} y-coordinate of the top-left corner of the box.
 *     - `x2`: {`number`} x-coordinate of the bottom-right corner of the box.
 *     - `y2`: {`number`} y-coordinate of the bottom-right corner of the box.
 *   - `featureIndex`: {`number`}
 *     Index of the feature associated with the collision box.
 *   - `feature`: {`object`}
 *     Feature associated with the collision box.
 */
export function collectCollisionBoxesAndFeatures (map, sourceName) {
  const POLLING_INTERVAL = 100
  const POLLING_TIMEOUT = 50 // # of iterations
  const { style } = map
  // makes sure that the placement currently running is done; i.e., not stale
  function promiseReady () {
    let iteration = 0
    let timerId
    return new Promise((resolve, reject) => {
      timerId = setInterval(
        () => {
          const { placement } = style
          if (!placement.stale) {
            resolve(placement)
          } else {
            ++iteration
            if (iteration >= POLLING_TIMEOUT) {
              reject(new Error('placement stale timed out'))
            }
          }
        },
        POLLING_INTERVAL)
    }).finally(() => clearInterval(timerId))
  }
  return promiseReady()
    .then(placement => {
      const {
        collisionIndex,
        retainedQueryData,
        transform,
      } = placement
      const sourceCache = style.sourceCaches[sourceName]
      const { _tiles } = sourceCache
      const results = []
      for (let tileName in _tiles) {
        const tile = _tiles[tileName]
        const {
          buckets,
          collisionBoxArray,
        } = tile
        if (!collisionBoxArray) {
          // sometimes waiting for placement.stale turning to false
          // is not enough and collisionBoxArray does not exist.
          // this situation resolves after waiting for a while.
          // but I could not figure out how long I have to wait.
          // just ignores it and it looks benign so far.
          console.warn('collisionBoxArray is not defined yet')
          continue
        }
        const posMat = transform.calculatePosMatrix(tile.tileID.toUnwrapped())
        const textPixelRatio = tile.tileSize / EXTENT
        const tileResults = []
        for (let i = 0; i < collisionBoxArray.length; ++i) {
          const collisionBox = collisionBoxArray.get(i)
          const {
            x1,
            y1,
            x2,
            y2,
            anchorPointX,
            anchorPointY,
            featureIndex,
            bucketIndex,
            sourceLayerIndex,
          } = collisionBox
          const projectedPoint = collisionIndex.projectAndGetPerspectiveRatio(
            posMat,
            anchorPointX,
            anchorPointY)
          const tileToViewport = textPixelRatio * projectedPoint.perspectiveRatio
          const tlX = ((x1 * tileToViewport) + projectedPoint.point.x) - VIEWPORT_PADDING
          const tlY = ((y1 * tileToViewport) + projectedPoint.point.y) - VIEWPORT_PADDING
          const brX = ((x2 * tileToViewport) + projectedPoint.point.x) - VIEWPORT_PADDING
          const brY = ((y2 * tileToViewport) + projectedPoint.point.y) - VIEWPORT_PADDING
          // `bucketInstanceId` is necessary
          // because `bucketIndex` is not unique in `retainedQueryData`
          const bucket = Object.values(buckets)
            .find(b => b.index === bucketIndex)
          const { bucketInstanceId } = bucket
          const queryData = retainedQueryData[bucketInstanceId]
          const bucketSymbols = queryData.featureIndex.lookupSymbolFeatures(
            [featureIndex],
            map.style._serializedLayers,
            bucketIndex,
            sourceLayerIndex,
            null, // filterSpec
            null, // filterLayerIDs
            map.style._availableImages,
            map.style._layers)
          const { feature } = bucketSymbols[sourceName][0]
          tileResults.push({
            collisionBox: {
              x1: tlX,
              y1: tlY,
              x2: brX,
              y2: brY,
            },
            featureIndex,
            feature,
          })
        }
        results.push(tileResults)
      }
      // flattens the results
      return Array.prototype.concat.apply([], results)
    })
}

/**
 * Returns whether given two boxes intersect.
 *
 * @function boxesIntersect
 *
 * @static
 *
 * @memberof modules:utils/mapbox
 *
 * @param {object} box1
 *
 *   Box to be tested.
 *   Has the following fields,
 *   - `x1`: {`number`} x-coordinate of the top-left corner of the box.
 *   - `y1`: {`number`} y-coordinate of the top-left corner of the box.
 *   - `x2`: {`number`} x-coordinate of the bottom-right corner of the box.
 *   - `y2`: {`number`} y-coordinate of the bottom-right corner of the box.
 *
 * @param {object} box2
 *
 *   Another box to be tested.
 *   Has the same fields as `box1`.
 *
 * @return {boolean}
 *
 *   Whether `box1` and `box2` intersect.
 */
export function boxesIntersect (box1, box2) {
  return (box1.x1 < box2.x2) &&
    (box1.y1 < box2.y2) &&
    (box1.x2 > box2.x1) &&
    (box1.y2 > box2.y1)
}
