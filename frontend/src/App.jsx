import React, { useState } from 'react'
import MapView from './components/MapView'
import FeedPanel from './components/FeedPanel'
import AuthPanel from './components/AuthPanel'

export default function App({ useMock }) {
  const [selectedTile, setSelectedTile] = useState(null)
  const [user, setUser] = useState(useMock ? { username: 'mock-user' } : null)

  return (
    <div className="app">
      <div className="left">
        <AuthPanel useMock={useMock} onAuthChange={setUser} />
        <FeedPanel selectedTile={selectedTile} user={user} />
      </div>
      <div className="map">
        <MapView onSelectTile={setSelectedTile} selectedTile={selectedTile} />
      </div>
    </div>
  )
}
