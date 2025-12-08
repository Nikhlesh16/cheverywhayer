# HyperLocal - H3-Based Hyperlocal Workspace System

A scalable, modular system for creating hyperlocal communities using H3 hexagonal tiling. Users can interact with 5 km hexagonal regions on an interactive map, post updates, and communicate with others in their region.

## 🌍 System Architecture

### Tech Stack

**Frontend:**
- Next.js 14 with TypeScript
- React-Leaflet for interactive mapping
- Tailwind CSS for styling
- Zustand for state management
- Socket.io-client for real-time updates
- H3.js for geospatial grid calculations

**Backend:**
- NestJS with TypeScript
- PostgreSQL for persistent storage
- Prisma ORM for database management
- Redis for caching and pub/sub
- Socket.io for WebSocket communication
- JWT authentication

**Infrastructure:**
- Docker & Docker Compose for containerization
- Nginx for reverse proxy and load balancing
- PostgreSQL 16 Alpine
- Redis 7 Alpine

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── auth/                 # JWT authentication
│   │   ├── gateway/              # Socket.io gateway
│   │   ├── posts/                # Post creation/fetching
│   │   ├── workspaces/           # H3-based workspace management
│   │   ├── regions/              # Region membership
│   │   ├── prisma/               # Database service
│   │   ├── redis/                # Redis service
│   │   ├── app.module.ts         # Main app module
│   │   └── main.ts               # Entry point
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Main page
│   │   │   └── globals.css       # Global styles
│   │   ├── components/
│   │   │   ├── MapView.tsx       # Interactive H3 map
│   │   │   ├── FeedPanel.tsx     # Post feed
│   │   │   ├── AuthPanel.tsx     # Login/Register
│   │   │   └── Composer.tsx      # Post composer
│   │   ├── hooks/
│   │   │   └── useSocket.ts      # Socket.io hook
│   │   ├── lib/
│   │   │   └── api.ts            # API client
│   │   ├── store/
│   │   │   ├── auth.ts           # Auth store
│   │   │   └── region.ts         # Region store
│   │   └── utils/
│   │       └── h3.ts             # H3 utilities
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── .env.example
│
├── docker-compose.yml            # Service orchestration
├── Dockerfile.backend            # Backend container
├── Dockerfile.frontend           # Frontend container
├── nginx.conf                    # Reverse proxy config
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 16+ (for local development)
- Redis 7+ (for local development)

### Option 1: Docker (Recommended)

```bash
# Clone and navigate to project
cd cheverywhayer

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up -d

# Run database migrations
docker exec hyperlocal-backend npm run prisma:migrate

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Nginx Proxy: http://localhost
```

### Option 2: Local Development

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Update .env with local database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hyperlocal_db

# Run database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run start:dev
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development server
npm run dev

# Application runs on http://localhost:3000
```

## 🗺️ Key Features

### H3 Hexagonal Grid System

- **Resolution 8 hexagons** (~5 km per side)
- **Automatic workspace creation** when users click on a hexagon
- **K-ring queries** for fetching nearby regions
- **Efficient spatial queries** using PostgreSQL + Prisma
- **Real-time visualization** of H3 cells on interactive map

### User Authentication

- JWT-based authentication
- Secure password hashing with bcryptjs
- Token refresh strategy
- Protected API endpoints

### Geospatial Features

- Zoom-dependent H3 grid rendering
- User location tracking via geolocation API
- Hexagon boundary visualization
- Member status indicators (green for membership)
- Automatic region joining on click

### Real-Time Updates

- Socket.io WebSocket connections
- Room-based broadcasting by H3 region
- Real-time post notifications
- Presence detection
- Pub/sub updates via Redis

### Post Management

- Create posts within regions
- Membership verification
- Fetch posts with pagination
- Nearby region post queries
- Post deletion with authorization

## 🔌 API Endpoints

### Authentication

```
POST   /auth/register
POST   /auth/login
```

### Workspaces

```
GET    /workspaces/latlng-to-h3              # Convert coordinates to H3
POST   /workspaces/h3/:h3Index              # Get/create workspace
GET    /workspaces/h3/:h3Index              # Get workspace
GET    /workspaces/nearby/:h3Index          # Get nearby workspaces
GET    /workspaces/boundaries/:h3Index      # Get H3 cell boundaries
POST   /workspaces/join/:h3Index            # Join region
GET    /workspaces/check-membership/:h3Index # Check membership
GET    /workspaces/my-regions               # Get user's regions
```

### Posts

```
POST   /posts/:h3Index                      # Create post
GET    /posts/:h3Index                      # Get region posts
GET    /posts/nearby/:h3Index               # Get nearby posts
DELETE /posts/:postId                       # Delete post
```

### WebSocket Events (Socket.io)

```
subscribe-region      # Subscribe to region updates
unsubscribe-region    # Unsubscribe from region
post-message          # Post to region
new-post              # Receive new post
get-active-regions    # Get user's active regions
```

## 📊 Database Schema

### Models

**User**
- id, email, password, name, avatar
- Relations: posts, regions

**Workspace**
- id, h3Index (unique), name, description
- Relations: posts, members

**Post**
- id, content, userId, workspaceId, timestamps
- Relations: user, workspace

**RegionMembership**
- id, userId, workspaceId, latitude, longitude
- Unique constraint: (userId, workspaceId)

## 🔐 Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hyperlocal_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
H3_RESOLUTION=8
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Service Health

```bash
# Check service status
docker-compose ps

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
```

## 🔄 Database Migrations

```bash
# Create migration
docker exec hyperlocal-backend npm run prisma:migrate

# View database
docker exec hyperlocal-backend npm run prisma:studio

# Generate Prisma types
docker exec hyperlocal-backend npm run prisma:generate
```

## 🌐 Nginx Configuration

The nginx.conf provides:
- **Rate limiting** for API and general endpoints
- **Gzip compression** for static assets
- **WebSocket proxy** for Socket.io
- **Static file caching** (60 days for assets)
- **Load balancing** across services
- **Health checks** and monitoring

## 📈 Performance Optimization

- **Redis caching** for workspace queries (5-minute TTL)
- **Pagination** for post fetching
- **H3 cell sampling** for map rendering
- **Connection pooling** via Prisma
- **Nginx gzip compression** for frontend assets
- **Docker layer caching** for faster builds

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## 🔗 API Documentation

### Create Post Example

```bash
curl -X POST http://localhost:3001/posts/8a794627fffffff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content": "Hello from my region!"}'
```

### Get Nearby Posts

```bash
curl -X GET "http://localhost:3001/posts/nearby/8a794627fffffff?ringSize=1&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Scaling Considerations

- **PostgreSQL**: Connection pooling, read replicas
- **Redis**: Cluster mode for high availability
- **Backend**: Horizontal scaling with Docker Swarm or Kubernetes
- **Frontend**: CDN distribution for static assets
- **Nginx**: Load balancer configuration for multiple backend instances

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please follow:
1. Create feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit changes (`git commit -m 'Add AmazingFeature'`)
3. Push to branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## ❓ Support & Issues

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/Nikhlesh16/cheverywhayer/issues)
- Email: support@hyperlocal.dev

---

**Built with ❤️ by Nikhlesh16**
#   R e d e p l o y  
 