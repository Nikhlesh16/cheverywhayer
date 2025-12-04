import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function PostItem({ post, user }) {
  const [comments, setComments] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (showComments) {
      axios.get(`${API}/posts/${post.postId}/comments`)
        .then((res) => setComments(res.data.comments || []))
        .catch(() => {})
    }
  }, [showComments, post.postId])

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setLoading(true)
    try {
      const res = await axios.post(`${API}/posts/${post.postId}/comments`, { text: commentText })
      setComments((prev) => [...prev, res.data])
      setCommentText('')
    } catch (err) {
      alert('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="post">
      <div className="meta">
        <span className="author">{post.authorId || 'Anonymous'}</span>
        <span className="time">{new Date(post.createdAt).toLocaleString()}</span>
      </div>
      <div className="text">{post.text}</div>
      {post.images && post.images.length > 0 && (
        <div className="images">
          {post.images.map((key) => (
            <img key={key} src={`${API}/${key}`} alt="attachment" />
          ))}
        </div>
      )}
      <div className="actions">
        <button className="link-btn" onClick={() => setShowComments((v) => !v)}>
          {showComments ? 'Hide comments' : 'Comments'}
        </button>
      </div>
      {showComments && (
        <div className="comments-section">
          {comments.map((c) => (
            <div key={c.commentId} className="comment">
              <span className="author">{c.authorId || 'Anon'}</span>: {c.text}
            </div>
          ))}
          {user && (
            <form className="comment-form" onSubmit={handleAddComment}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
              />
              <button disabled={loading}>Send</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
