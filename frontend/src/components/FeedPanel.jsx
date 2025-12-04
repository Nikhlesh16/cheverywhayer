import React, { useEffect, useState } from 'react'
import Composer from './Composer'
import PostItem from './PostItem'
import axios from 'axios'
import { getAdjacentTileIds } from '../utils/tile'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function FeedPanel({ selectedTile, user }) {
  const [posts, setPosts] = useState([])
  const [showNearby, setShowNearby] = useState(false)

  useEffect(() => {
    async function load() {
      if (!selectedTile) return
      try {
        let url
        if (showNearby) {
          const tiles = getAdjacentTileIds(selectedTile.tileId).join(',')
          url = `${API}/posts?tiles=${tiles}`
        } else {
          url = `${API}/posts?tileId=${selectedTile.tileId}`
        }
        const res = await axios.get(url)
        setPosts(res.data.posts || [])
      } catch (err) {
        console.error('Failed to fetch posts', err)
      }
    }
    load()
  }, [selectedTile, showNearby])

  function handlePosted(newPost) {
    setPosts((prev) => [newPost, ...prev])
  }

  return (
    <div className="feed">
      <div className="feed-header">
        {selectedTile ? (
          <>
            <span>{selectedTile.tileId}</span>
            <label className="nearby-toggle">
              <input type="checkbox" checked={showNearby} onChange={(e) => setShowNearby(e.target.checked)} />
              Show nearby tiles
            </label>
          </>
        ) : (
          'Click on the map to select a tile'
        )}
      </div>
      {user && selectedTile && (
        <Composer selectedTile={selectedTile} onPosted={handlePosted} />
      )}
      <div className="posts">
        {posts.length === 0 && selectedTile && <p className="empty">No posts yet in this tile.</p>}
        {posts.map((p) => (
          <PostItem key={p.postId} post={p} user={user} />
        ))}
      </div>
    </div>
  )
}
