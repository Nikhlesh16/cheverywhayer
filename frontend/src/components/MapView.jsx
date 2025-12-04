import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMapEvents, Rectangle } from 'react-leaflet'
import L from 'leaflet'
import { tileIdFromLatLon } from '../utils/tile'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const R = 6378137.0
const TILE_SIZE = 5000

// Convert tile x,y back to approximate lat/lon bounds for rectangle display
function tileBounds(tileId) {
  const [, xStr, yStr] = tileId.split('_')
  const tx = parseInt(xStr, 10)
  const ty = parseInt(yStr, 10)
  const minX = tx * TILE_SIZE
  const maxX = (tx + 1) * TILE_SIZE
  const minY = ty * TILE_SIZE
  const maxY = (ty + 1) * TILE_SIZE

  const metersXToLon = (x) => (x / R) * (180 / Math.PI)
  const metersYToLat = (y) => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI)

  return [
    [metersYToLat(minY), metersXToLon(minX)],
    [metersYToLat(maxY), metersXToLon(maxX)],
  ]
}

function ClickHandler({ onSelectTile }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      const tileId = tileIdFromLatLon(lat, lng)
      onSelectTile({ tileId, lat, lon: lng })
    },
  })
  return null
}

export default function MapView({ onSelectTile, selectedTile }) {
  const [center, setCenter] = useState([51.5074, -0.1278]) // default London

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
    }
  }, [])

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onSelectTile={onSelectTile} />
      {selectedTile && (
        <Rectangle bounds={tileBounds(selectedTile.tileId)} pathOptions={{ color: '#4f46e5', weight: 2 }} />
      )}
    </MapContainer>
  )
}
