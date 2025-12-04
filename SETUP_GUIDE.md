# HyperLocal Setup Guide

## 📋 System Requirements

- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
- **Docker Compose** v1.29+
- **Git**
- **Port availability**: 80, 3000, 3001, 5432, 6379

## 🚀 Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/Nikhlesh16/cheverywhayer.git
cd cheverywhayer
```

### Step 2: Run Setup Script

#### Windows:
```powershell
.\setup.bat
```

#### Linux/Mac:
```bash
chmod +x setup.sh
./setup.sh
```

### Step 3: Verify Services

```bash
docker-compose ps
```

Expected output:
```
NAME                 IMAGE                STATUS          PORTS
hyperlocal-nginx     nginx:alpine         Up              0.0.0.0:80->80/tcp
hyperlocal-frontend  cheverywhayer:...    Up              0.0.0.0:3000->3000/tcp
hyperlocal-backend   cheverywhayer:...    Up              0.0.0.0:3001->3001/tcp
hyperlocal-redis     redis:7-alpine       Up              0.0.0.0:6379->6379/tcp
hyperlocal-postgres  postgres:16-alpine   Up              0.0.0.0:5432->5432/tcp
```

## 🌐 Access Applications

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Register new account |
| Backend API | http://localhost:3001 | See API docs |
| Nginx Proxy | http://localhost | Frontend proxy |
| Postgres Admin | localhost:5432 | postgres/postgres |
| Redis CLI | localhost:6379 | No password |

## 📚 First Time Setup

### 1. Create Account

1. Navigate to http://localhost:3000
2. Click "Register"
3. Fill in email, password, and name
4. Click "Register" button

### 2. Explore the Map

1. Allow geolocation when prompted
2. Zoom into the map (scroll wheel or touch)
3. At zoom level 8+, H3 hexagons will appear
4. Hexagons are color-coded:
   - **Gray**: Not a member
   - **Green**: You are a member
   - **Red**: Currently selected

### 3. Join a Region

1. Click on any hexagon
2. Auto-confirms if geolocation is enabled
3. You can now post in that region

### 4. Post Updates

1. Select a region by clicking it
2. Type message in the composer box
3. Click "Post" button
4. Message appears in real-time

## 🐳 Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Operations

```bash
# Run migrations
docker-compose exec backend npm run prisma:migrate

# Open Prisma Studio (visual DB management)
docker-compose exec backend npm run prisma:studio

# Generate Prisma client
docker-compose exec backend npm run prisma:generate
```

### Shell Access

```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# PostgreSQL shell
docker-compose exec postgres psql -U postgres -d hyperlocal_db
```

## 🔧 Configuration

### Environment Variables

Modify `.env` files as needed:

**Backend** (backend/.env):
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hyperlocal_db
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRATION=7d
H3_RESOLUTION=8
```

**Frontend** (frontend/.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

After changes, restart services:
```bash
docker-compose restart
```

## 📊 Database Schema

View the schema at:
- File: `backend/prisma/schema.prisma`
- Visual: Run `docker-compose exec backend npm run prisma:studio`

## 🔐 Security Notes

⚠️ **For Development Only**

The setup includes default credentials:
- PostgreSQL: `postgres/postgres`
- JWT Secret: `your-super-secret-jwt-key-change-in-production`

**Before production deployment:**
1. Change all default passwords
2. Use strong JWT secret
3. Enable SSL/TLS
4. Configure CORS properly
5. Use environment-specific secrets

## 🐛 Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Full reset
docker-compose down -v
docker-compose up -d
```

### Database connection error

```bash
# Check PostgreSQL is healthy
docker-compose ps postgres

# Check connection string in .env
# Default: postgresql://postgres:postgres@postgres:5432/hyperlocal_db

# Reconnect from backend
docker-compose restart backend
```

### Redis connection error

```bash
# Check Redis is running
docker-compose exec redis redis-cli ping

# Should return: PONG
```

### Frontend blank/not loading

```bash
# Check frontend logs
docker-compose logs frontend

# Verify API URL is correct
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Clear Next.js cache
docker-compose exec frontend rm -rf .next
docker-compose restart frontend
```

### Port conflicts

If ports are in use, modify `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - '3000:3000'  # Change first number to available port
  backend:
    ports:
      - '3001:3001'  # Change as needed
```

## 📈 Performance Tips

1. **Increase Docker resources** if experiencing slowness
2. **Use Redis** for session caching (already configured)
3. **Enable Nginx gzip** for static assets (already configured)
4. **Optimize H3 queries** for large datasets
5. **Monitor database** using Prisma Studio

## 🚀 Production Deployment

See main README.md for:
- Kubernetes deployment
- CI/CD with GitHub Actions
- SSL/TLS configuration
- Database backups
- Monitoring setup

## 📖 Documentation

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [H3.js Documentation](https://h3geo.org/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Support

For issues:
1. Check logs: `docker-compose logs`
2. Review configuration files
3. Open GitHub issue: https://github.com/Nikhlesh16/cheverywhayer/issues

---

**Happy coding! 🎉**
