/**
 * Mock API server for local frontend development.
 * Mirrors the real AWS Lambda API endpoints.
 */
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Inline tile calculation (Web Mercator)
const R = 6378137.0;
function tileIdFromLatLon(lat, lon, tileSizeMeters = 5000) {
  const x = (lon * Math.PI / 180.0) * R;
  const y = R * Math.log(Math.tan(Math.PI / 4.0 + (lat * Math.PI / 180.0) / 2.0));
  const tx = Math.floor(x / tileSizeMeters);
  const ty = Math.floor(y / tileSizeMeters);
  return `tile_${tx}_${ty}`;
}

const app = express();
app.use(cors());
app.use(express.json());

// In-memory stores
const POSTS = {};
const COMMENTS = {};

// Presign (fake)
app.post('/presign', (req, res) => {
  const key = `uploads/${Date.now()}_${req.body.filename || uuidv4()}`;
  res.json({ uploadUrl: `http://localhost:3001/fake-upload/${key}`, key });
});

// Fake upload endpoint
app.put('/fake-upload/*', (req, res) => res.json({ ok: true }));

// Create post
app.post('/posts', (req, res) => {
  const { text, images = [], lat = 0, lon = 0 } = req.body;
  const tileId = tileIdFromLatLon(lat, lon);
  const postId = uuidv4();
  const createdAt = new Date().toISOString();
  const item = { tileId, postId, text, images, lat, lon, createdAt, authorId: 'local-user' };
  POSTS[postId] = item;
  res.status(201).json(item);
});

// Fetch posts
app.get('/posts', (req, res) => {
  const { tileId, tiles } = req.query;
  if (tileId) {
    const items = Object.values(POSTS).filter((p) => p.tileId === tileId);
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ posts: items });
  }
  if (tiles) {
    const list = tiles.split(',').map((t) => t.trim());
    const all = Object.values(POSTS).filter((p) => list.includes(p.tileId));
    all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ posts: all });
  }
  return res.status(400).json({ error: 'tileId or tiles required' });
});

// Add comment
app.post('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  if (!POSTS[postId]) return res.status(404).json({ error: 'post not found' });
  const commentId = uuidv4();
  const createdAt = new Date().toISOString();
  const comment = { postId, commentId, text, createdAt, authorId: 'local-user' };
  if (!COMMENTS[postId]) COMMENTS[postId] = [];
  COMMENTS[postId].push(comment);
  res.status(201).json(comment);
});

// Fetch comments
app.get('/posts/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const list = COMMENTS[postId] || [];
  res.json({ comments: list });
});

// Profile (mock)
app.get('/profile/:userId', (req, res) => {
  res.json({ userId: req.params.userId, displayName: 'Local User' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Mock API running at http://localhost:${port}`));
