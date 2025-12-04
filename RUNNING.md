# 🚀 Website is Running!

Your H3-based hyperlocal workspace application is now up and running with Docker!

## Access Points

- **Frontend Website**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL Database**: localhost:5432 (username: postgres, password: postgres)
- **Redis Cache**: localhost:6379
- **Nginx Reverse Proxy**: http://localhost (port 80)

## Running Services

All 5 Docker containers are running:

```
✅ hyperlocal-frontend  - Next.js frontend (port 3000)
✅ hyperlocal-backend   - NestJS backend API (port 3001)
✅ hyperlocal-nginx     - Nginx reverse proxy (ports 80, 443)
✅ hyperlocal-postgres  - PostgreSQL database (port 5432)
✅ hyperlocal-redis     - Redis cache (port 6379)
```

## Data Storage

All application data is stored on your D: drive:
- PostgreSQL data: `D:\SIMPI\Cheverywhayer\cheverywhayer\data\postgres`
- Redis data: `D:\SIMPI\Cheverywhayer\cheverywhayer\data\redis`
- No dependencies on C: drive (except Docker Desktop app itself)

## Docker Commands

```powershell
# View running containers
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Restart services
docker-compose restart

# Clean up everything
docker-compose down -v
```

## Technology Stack

**Frontend:**
- Next.js 14
- React 18
- React-Leaflet (interactive maps)
- Tailwind CSS
- Zustand (state management)
- Socket.io client (real-time updates)

**Backend:**
- NestJS 10 (REST API + WebSocket)
- Prisma 5.8 (ORM)
- PostgreSQL 16 (database)
- Redis 7 (caching)
- H3 (hexagonal tiling for geospatial regions)
- JWT (authentication)

**Infrastructure:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- All services on Alpine/Debian Linux images

## Features

The application provides:
- User authentication (register/login)
- H3-based hyperlocal workspace creation
- Real-time location tracking
- Post/comment creation in regions
- WebSocket-based real-time updates
- Geospatial region queries
- Redis caching for performance

## Troubleshooting

If a container exits unexpectedly:
```powershell
# Check container logs
docker logs hyperlocal-backend  # or frontend/nginx/postgres/redis

# Restart all services
docker-compose restart

# Full rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Next Steps

- Open http://localhost:3000 in your browser
- Register a new account
- Create a workspace by selecting a location on the map
- Start creating posts in your hyperlocal region!

---

**Status**: ✅ All systems operational
**Last Updated**: 2025-12-04
