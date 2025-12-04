# 🚀 Quick Reference Card

## 📥 Installation (Pick One)

### Docker (Recommended - 1 command)
```bash
docker-compose up -d
docker-compose exec backend npm run prisma:migrate
```

### Bash Script
```bash
./setup.sh
```

### PowerShell Script
```powershell
.\setup.bat
```

### Makefile
```bash
make setup
```

---

## 🌐 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Register new |
| **Backend API** | http://localhost:3001 | See docs |
| **Nginx Proxy** | http://localhost | Frontend proxy |
| **Postgres** | localhost:5432 | postgres/postgres |
| **Redis** | localhost:6379 | No password |

---

## 🔑 Key API Endpoints

### Authentication
```bash
POST /auth/register
POST /auth/login
```

### Workspaces (H3)
```bash
GET    /workspaces/latlng-to-h3              # Convert coords to H3
POST   /workspaces/h3/{h3Index}              # Get/create workspace
GET    /workspaces/nearby/{h3Index}          # Nearby regions
POST   /workspaces/join/{h3Index}            # Join region
GET    /workspaces/my-regions                # User's regions
```

### Posts
```bash
POST   /posts/{h3Index}                      # Create post
GET    /posts/{h3Index}                      # Get posts
GET    /posts/nearby/{h3Index}               # Nearby posts
DELETE /posts/{postId}                       # Delete post
```

### WebSocket Events
```javascript
socket.emit('subscribe-region', { h3Index });
socket.emit('post-message', { h3Index, content });
socket.on('new-post', (post) => {});
```

---

## 🛠️ Common Commands

### Development
```bash
make setup           # Initial setup
make up              # Start services
make down            # Stop services
make restart         # Restart services
make logs            # View all logs
make logs-backend    # Backend logs only
```

### Database
```bash
make migrate         # Run migrations
make studio          # Open Prisma Studio
make shell-db        # Database shell
make db-reset        # Full reset
```

### Debugging
```bash
make shell-backend   # Backend shell
make shell-frontend  # Frontend shell
make health          # Health check
make ps              # Service status
```

### Code Quality
```bash
make lint            # Linting
make test            # Tests
make test-coverage   # Coverage report
```

---

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hyperlocal_db
REDIS_HOST=redis
JWT_SECRET=your-secret-key
H3_RESOLUTION=8
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📦 Project Structure Quick View

```
cheverywhayer/
├── backend/              NestJS + PostgreSQL + Redis
│   ├── src/
│   │   ├── auth/        JWT authentication
│   │   ├── workspaces/  H3 geospatial logic
│   │   ├── posts/       Post management
│   │   ├── gateway/     Socket.io real-time
│   │   ├── redis/       Caching & pub/sub
│   │   └── prisma/      Database ORM
│   └── prisma/          Database schema
│
├── frontend/            Next.js + React + Tailwind
│   ├── src/
│   │   ├── app/         Layout & pages
│   │   ├── components/  React components
│   │   ├── hooks/       Custom hooks
│   │   └── store/       Zustand state
│
├── docker-compose.yml   Service orchestration
├── Dockerfile.*         Container images
├── nginx.conf          Reverse proxy
├── Makefile            Dev commands
└── README.md           Full documentation
```

---

## 🎯 User Journey

1. **Register/Login**
   - Go to http://localhost:3000
   - Create new account
   - JWT token auto-saved

2. **Explore Map**
   - Allow geolocation
   - Zoom in to zoom level 8+
   - H3 hexagons appear

3. **Select Region**
   - Click any hexagon
   - Auto-joins region
   - See recent posts

4. **Post Update**
   - Type message in composer
   - Click "Post"
   - Real-time broadcast to region

5. **Explore Nearby**
   - Map shows all nearby regions
   - Click to switch regions
   - Chat with different communities

---

## ⚡ Performance Tips

- **Redis**: Caches workspace queries (5-min TTL)
- **Nginx**: Gzip compression, 60-day static caching
- **Pagination**: Posts load 50 per page
- **H3**: Grid only renders at zoom 8+
- **Connection pooling**: Prisma manages DB connections

---

## 🔒 Security Checklist

✅ JWT authentication
✅ Password hashing (bcryptjs)
✅ CORS protection
✅ Rate limiting (Nginx)
✅ Protected routes (JWT guard)
✅ SQL injection prevention (Prisma)
✅ Environment variable isolation
✅ Docker network isolation

---

## 📊 Tech Stack Summary

**Frontend**: Next.js 14 | React 18 | Tailwind | Zustand | Socket.io
**Backend**: NestJS 10 | TypeScript | Prisma | PostgreSQL | Redis
**DevOps**: Docker | Docker Compose | Nginx | GitHub Actions (ready)
**Geo**: H3.js | React-Leaflet | Leaflet

---

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Services won't start | `docker-compose restart` |
| DB connection error | Check DATABASE_URL in .env |
| Port already in use | Modify docker-compose.yml |
| Frontend blank | Clear cache: `docker-compose exec frontend rm -rf .next` |
| Logs not showing | Run `docker-compose logs -f` |
| H3 grid not visible | Zoom in more (must be zoom 8+) |

---

## 📞 Getting Help

1. **Check logs**: `docker-compose logs`
2. **Read docs**: See README.md and SETUP_GUIDE.md
3. **Debug**: Use `docker-compose exec shell` commands
4. **Database**: Use `make studio` to inspect data
5. **GitHub**: Create issue on repo

---

## 🎓 Key Learnings

This codebase demonstrates:
- ✅ Full-stack TypeScript development
- ✅ Microservices architecture pattern
- ✅ Real-time communication (Socket.io)
- ✅ Geospatial indexing (H3)
- ✅ Cache-first architecture (Redis)
- ✅ Docker containerization
- ✅ Production-ready practices

---

## 🚀 Next Steps

1. **Run locally**: `make setup`
2. **Explore code**: Check FILE_MANIFEST.md
3. **Create account**: http://localhost:3000
4. **Play with API**: Use Postman/Thunder Client
5. **Deploy**: See README.md deployment section

---

**Ready to build? Start with `docker-compose up -d` 🎉**
