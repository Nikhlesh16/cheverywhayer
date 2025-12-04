/**
 * Web Mercator tile calculation.
 * Converts lat/lon to 5km x 5km tile IDs.
 */
const R = 6378137.0; // Web Mercator radius (meters)

function lonToMetersX(lon) {
  return (lon * Math.PI / 180.0) * R;
}

function latToMetersY(lat) {
  const rad = lat * Math.PI / 180.0;
  return R * Math.log(Math.tan(Math.PI / 4.0 + rad / 2.0));
}

/**
 * Compute tile ID from latitude/longitude.
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @param {number} tileSizeMeters - tile size (default 5000m)
 * @returns {string} tile ID e.g. "tile_1234_5678"
 */
function tileIdFromLatLon(lat, lon, tileSizeMeters = 5000) {
  const x = lonToMetersX(lon);
  const y = latToMetersY(lat);
  const tx = Math.floor(x / tileSizeMeters);
  const ty = Math.floor(y / tileSizeMeters);
  return `tile_${tx}_${ty}`;
}

module.exports = { lonToMetersX, latToMetersY, tileIdFromLatLon };
