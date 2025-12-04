# Hyperlocal Tiles MVP

A serverless hyperlocal community web app where the world map is divided into 5 km × 5 km tiles. Each tile acts as a community feed (like WhatsApp groups or Slack channels) where anyone can view posts and authenticated users can share updates or ask questions.

## Project Structure

```
├── backend/
│   ├── template.yaml          # AWS SAM template (Cognito, DynamoDB, S3, Lambda, API Gateway)
│   ├── package.json
│   ├── src/
│   │   ├── handlers/          # Lambda function handlers
│   │   │   ├── presign.js     # Generates S3 presigned upload URLs
│   │   │   ├── createPost.js
│   │   │   ├── fetchPosts.js
│   │   │   ├── addComment.js
│   │   │   ├── fetchComments.js
│   │   │   └── getProfile.js
│   │   └── utils/
│   │       └── tile.js        # Web Mercator tile ID calculation
│   └── mock-server/           # Local Express mock API
│       ├── package.json
│       └── index.js
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── styles.css
│       ├── utils/tile.js
│       └── components/
│           ├── AuthPanel.jsx
│           ├── MapView.jsx
│           ├── FeedPanel.jsx
│           ├── Composer.jsx
│           └── PostItem.jsx
└── README.md
```

---

## Quick Start — Local Development

### 1. Start the mock API server

```powershell
cd backend/mock-server
npm install
npm start
```

The mock server runs at `http://localhost:3001` and stores posts/comments in memory.

### 2. Start the frontend

```powershell
cd frontend
npm install
copy .env.example .env      # Windows
# or: cp .env.example .env  # Linux/Mac
npm run dev
```

Open `http://localhost:5173` in your browser.

- Click anywhere on the map to select a 5 km tile.
- You can create posts immediately (mock mode skips real auth).
- Toggle "Show nearby tiles" to fetch posts from adjacent 3×3 tiles.

---

## Deploy to AWS (Free Tier)

### Prerequisites

- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed (`pip install aws-sam-cli` or [installer](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- Node.js 18+

### 1. Deploy the backend with SAM

```powershell
cd backend
npm install
sam build
sam deploy --guided
```

During `--guided`:
- Stack name: e.g. `hyperlocal-tiles`
- Region: e.g. `us-east-1`
- Accept defaults for the rest

After deployment, SAM outputs:
- `ApiEndpoint` — your API URL
- `UserPoolId`
- `UserPoolClientId`
- `MediaBucketName`

### 2. Configure the frontend

Edit `frontend/.env` (copy from `.env.example`):

```
VITE_API_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
VITE_USE_MOCK=false
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXX
```

### 3. Deploy frontend to AWS Amplify Hosting

Option A: **Amplify Console (GUI)**
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2. Create a new app → "Host web app".
3. Connect your Git repo (or drag-and-drop the `frontend/` folder for manual deploy).
4. Set build command: `npm run build`, output dir: `dist`.
5. Add environment variables from your `.env` file.

Option B: **Amplify CLI**
```powershell
npm install -g @aws-amplify/cli
cd frontend
amplify init
amplify add hosting
amplify publish
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/posts?tileId=...` | None | Fetch posts for a tile |
| GET | `/posts?tiles=...` | None | Fetch posts for multiple tiles (comma-sep) |
| POST | `/posts` | JWT | Create a new post |
| GET | `/posts/{postId}/comments` | None | Fetch comments for a post |
| POST | `/posts/{postId}/comments` | JWT | Add a comment |
| POST | `/presign` | JWT | Get presigned S3 upload URL |
| GET | `/profile/{userId}` | JWT | Get user profile |

---

## Tile Calculation (Web Mercator)

```javascript
const R = 6378137.0; // Earth radius in meters
function tileIdFromLatLon(lat, lon, tileSize = 5000) {
  const x = (lon * Math.PI / 180) * R;
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return `tile_${Math.floor(x / tileSize)}_${Math.floor(y / tileSize)}`;
}
```

---

## Features

- **Map View**: Full-screen Leaflet + OpenStreetMap with click-to-select tile.
- **Feed Panel**: View posts in selected tile; toggle to show 3×3 nearby tiles.
- **Composer**: Create posts with optional image upload (presigned S3 URL).
- **Comments**: Expand any post to view/add comments.
- **Auth**: Cognito email/password sign-up, sign-in, confirmation flow.
- **Rate Limiting**: Frontend limits posting to 5 per minute per user.

---

## Future Enhancements

- Mobile app (React Native) sharing same backend.
- Push notifications via SNS.
- Real-time updates via WebSockets (API Gateway WebSocket API).
- User profiles with display names and avatars.
- Moderation / reporting tools.

---

## License

MIT — feel free to adapt for your community!
