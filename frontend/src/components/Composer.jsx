import React, { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Simple frontend rate limiter: max 5 posts per 60s
function allowedToPost() {
  const key = 'hl_posts_timestamps'
  const now = Date.now()
  const windowMs = 60000
  const max = 5
  const raw = JSON.parse(localStorage.getItem(key) || '[]')
  const recent = raw.filter((t) => now - t < windowMs)
  if (recent.length >= max) return false
  recent.push(now)
  localStorage.setItem(key, JSON.stringify(recent))
  return true
}

export default function Composer({ selectedTile, onPosted }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allowedToPost()) {
      alert('Rate limit: max 5 posts per minute')
      return
    }
    setLoading(true)
    try {
      let images = []
      if (file) {
        // Get presigned URL
        const pres = await axios.post(`${API}/presign`, { filename: file.name, contentType: file.type })
        const { uploadUrl, key } = pres.data
        // Upload file directly to presigned URL
        await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })
        images = [key]
      }

      const lat = selectedTile?.lat || 0
      const lon = selectedTile?.lon || 0
      const body = { text, images, lat, lon }
      const res = await axios.post(`${API}/posts`, body)
      setText('')
      setFile(null)
      onPosted && onPosted(res.data)
    } catch (err) {
      console.error(err)
      alert('Failed to post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share an update or ask a question..."
        rows={3}
      />
      <div className="composer-row">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="submit" disabled={loading || (!text.trim() && !file)}>
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  )
}
