/**
 * Web Mercator tile calculation utility.
 * Converts lat/lon to 5km × 5km tile IDs.
 */
const R = 6378137.0 // Web Mercator radius (meters)

export function lonToMetersX(lon) {
  return (lon * Math.PI / 180.0) * R
}

export function latToMetersY(lat) {
  const rad = lat * Math.PI / 180.0
  return R * Math.log(Math.tan(Math.PI / 4.0 + rad / 2.0))
}

/**
 * Compute tile ID from latitude/longitude.
 * @param {number} lat
 * @param {number} lon
 * @param {number} tileSizeMeters - default 5000m
 * @returns {string} tile ID e.g. "tile_1234_5678"
 */
export function tileIdFromLatLon(lat, lon, tileSizeMeters = 5000) {
  const x = lonToMetersX(lon)
  const y = latToMetersY(lat)
  const tx = Math.floor(x / tileSizeMeters)
  const ty = Math.floor(y / tileSizeMeters)
  return `tile_${tx}_${ty}`
}

/**
 * Generate list of adjacent tiles (3x3 grid centered on given tile).
 * Useful for fetching nearby activity.
 */
export function getAdjacentTileIds(tileId) {
  const [, xStr, yStr] = tileId.split('_')
  const x = parseInt(xStr, 10)
  const y = parseInt(yStr, 10)
  const ids = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      ids.push(`tile_${x + dx}_${y + dy}`)
    }
  }
  return ids
}
