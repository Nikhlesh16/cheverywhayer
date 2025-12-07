# 📊 Complete Environment Variables Audit & Cloud Deployment Report

## Executive Summary

This document provides a complete audit of all environment variables used in the Cheverywhayer application, organized by service and platform compatibility.

---

## 🎯 Environment Variables Inventory

### Frontend Variables (Next.js)

All frontend variables **MUST** be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

| Variable | Required | Default | Cloud Platform | Description |
|----------|----------|---------|----------------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | `http://localhost:3001` | Vercel, Netlify | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | ❌ No | Falls back to API_URL | Vercel, Netlify | WebSocket URL (if different from API) |
| `NODE_ENV` | ❌ No | `development` | All platforms | Node environment mode |
| `NEXT_PUBLIC_ENABLE_DM` | ❌ No | `true` | All platforms | Feature flag: Direct messaging |
| `NEXT_PUBLIC_ENABLE_IMAGE_UPLOAD` | ❌ No | `true` | All platforms | Feature flag: Image uploads |
| `NEXT_PUBLIC_ENABLE_LOCATION_SEARCH` | ❌ No | `true` | All platforms | Feature flag: Location search |
| `NEXT_PUBLIC_MAP_TILE_URL` | ❌ No | OpenStreetMap | All platforms | Custom map tile provider |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ❌ No | - | All platforms | Mapbox API token (if using Mapbox) |
| `NEXT_PUBLIC_GEOCODING_URL` | ❌ No | Nominatim | All platforms | Geocoding API endpoint |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ❌ No | - | All platforms | Google Maps API key |
| `NEXT_PUBLIC_GA_ID` | ❌ No | - | All platforms | Google Analytics ID |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | ❌ No | - | All platforms | Plausible Analytics domain |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ No | - | All platforms | Sentry error tracking DSN |
| `NEXT_PUBLIC_APP_NAME` | ❌ No | `Cheverywhayer` | All platforms | Application name |
| `NEXT_PUBLIC_APP_DESCRIPTION` | ❌ No | - | All platforms | Application description |

**Used in files:**
- `frontend/src/lib/api.ts` → `NEXT_PUBLIC_API_URL`
- `frontend/src/hooks/useSocket.ts` → `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

---

### Backend Variables (NestJS)

| Variable | Required | Default | Cloud Platform | Description |
|----------|----------|---------|----------------|-------------|
| `DATABASE_URL` | ✅ Yes | `postgresql://postgres:postgres@localhost:5432/hyperlocal_db` | Railway, Render, Fly.io, Supabase | PostgreSQL connection string |
| `REDIS_URL` | ✅ Yes* | - | Railway, Render, Fly.io, Upstash | Redis connection URL (TLS preferred) |
| `REDIS_HOST` | ✅ Yes* | `localhost` | Local Docker | Redis hostname (if not using REDIS_URL) |
| `REDIS_PORT` | ✅ Yes* | `6379` | Local Docker | Redis port (if not using REDIS_URL) |
| `REDIS_PASSWORD` | ❌ No | - | Local Docker | Redis password (if not using REDIS_URL) |
| `JWT_SECRET` | ✅ Yes | - | All platforms | JWT signing secret (CHANGE IN PRODUCTION) |
| `JWT_EXPIRATION` | ❌ No | `7d` | All platforms | JWT token expiration time |
| `PORT` | ❌ No | `3001` | All platforms | Server port (cloud platforms override) |
| `NODE_ENV` | ❌ No | `development` | All platforms | Node environment mode |
| `CORS_ORIGINS` | ✅ Yes | `http://localhost:3000` | All platforms | Comma-separated CORS origins (supports wildcards) |
| `H3_RESOLUTION` | ❌ No | `8` | All platforms | H3 hexagon resolution (7-9) |
| `S3_BUCKET` | ❌ No | - | AWS | S3 bucket name (optional file storage) |
| `S3_REGION` | ❌ No | - | AWS | S3 region |
| `S3_ACCESS_KEY_ID` | ❌ No | - | AWS | S3 access key |
| `S3_SECRET_ACCESS_KEY` | ❌ No | - | AWS | S3 secret key |
| `CLOUDINARY_URL` | ❌ No | - | Cloudinary | Cloudinary connection URL |
| `SUPABASE_URL` | ❌ No | - | Supabase | Supabase project URL (for storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ No | - | Supabase | Supabase service role key |
| `SENTRY_DSN` | ❌ No | - | Sentry | Sentry error tracking DSN |

\* Either `REDIS_URL` OR (`REDIS_HOST` + `REDIS_PORT`) is required

**Used in files:**
- `backend/src/main.ts` → `PORT`, `CORS_ORIGINS`, `NODE_ENV`
- `backend/src/gateway/gateway.ts` → `CORS_ORIGINS`
- `backend/src/redis/redis.service.ts` → `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `backend/prisma/schema.prisma` → `DATABASE_URL`

---

### Docker Compose Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `hyperlocal_db` | PostgreSQL database name |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `BACKEND_PORT` | `3001` | Backend service port |
| `FRONTEND_PORT` | `3000` | Frontend service port |
| `NGINX_HTTP_PORT` | `80` | Nginx HTTP port |
| `NGINX_HTTPS_PORT` | `443` | Nginx HTTPS port |

---

## 🌐 Platform-Specific Configuration

### 1. Vercel (Frontend Only)

**Platform Type:** Serverless / Edge Functions  
**Best For:** Next.js frontend hosting  
**Not Suitable For:** Backend (NestJS)

#### Required Variables:
```env
# Production Environment
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NODE_ENV=production

# Optional
NEXT_PUBLIC_WS_URL=https://your-backend.up.railway.app
```

#### Configuration Location:
- Dashboard → Project → Settings → Environment Variables
- Set for: Production, Preview, Development

#### Auto-Provided Variables:
```env
VERCEL_URL=your-app.vercel.app
VERCEL_GIT_COMMIT_SHA=abc123...
VERCEL_ENV=production
```

---

### 2. Railway (Backend + Database + Redis)

**Platform Type:** Container Platform  
**Best For:** Backend hosting with managed services  
**Free Tier:** $5/month credits

#### Required Variables:
```env
# From Railway Plugins (Auto-provided):
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Manual Configuration:
JWT_SECRET=<generate with: openssl rand -base64 32>
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
H3_RESOLUTION=8
JWT_EXPIRATION=7d
```

#### Configuration Location:
- Dashboard → Project → Variables tab

#### Auto-Provided Variables:
```env
RAILWAY_PUBLIC_DOMAIN=your-app-name.up.railway.app
RAILWAY_PRIVATE_NETWORK_DOMAIN=your-app-name.railway.internal
RAILWAY_ENVIRONMENT=production
```

#### Setup Steps:
1. Create project
2. Add PostgreSQL plugin (auto-creates `DATABASE_URL`)
3. Add Redis plugin (auto-creates `REDIS_URL`)
4. Add remaining variables manually
5. Connect GitHub repo for auto-deploy

---

### 3. Render (Backend + Database)

**Platform Type:** Cloud Platform  
**Best For:** Budget deployments  
**Free Tier:** Free web services (with cold starts)

#### Required Variables:
```env
# From Render PostgreSQL (Copy manually):
DATABASE_URL=postgresql://user:password@hostname/database

# From Upstash (External service):
REDIS_URL=rediss://default:password@region.upstash.io:6379

# Manual Configuration:
JWT_SECRET=<generate>
NODE_ENV=production
PORT=10000
CORS_ORIGINS=https://your-app.vercel.app
H3_RESOLUTION=8
```

#### Configuration Location:
- Dashboard → Web Service → Environment tab

#### Auto-Provided Variables:
```env
RENDER_SERVICE_NAME=your-app-name
RENDER_EXTERNAL_URL=https://your-app-name.onrender.com
PORT=10000
```

#### Notes:
- Free tier spins down after 15 min inactivity
- First request after spin-down takes 30+ seconds
- PostgreSQL free tier expires after 90 days

---

### 4. Fly.io (Full Stack)

**Platform Type:** Docker Platform  
**Best For:** Advanced users, global deployment  
**Free Tier:** 3 VMs, 160GB bandwidth

#### Required Variables:
```env
# Auto-provided by Fly.io:
DATABASE_URL=postgresql://...@your-app-db.flycast:5432/dbname
REDIS_URL=redis://...@your-app-redis.flycast:6379

# Set via CLI (fly secrets set):
JWT_SECRET=<generate>
CORS_ORIGINS=https://your-frontend.fly.dev
```

#### Configuration Method:
```bash
# Set secrets via CLI
fly secrets set \
  JWT_SECRET=$(openssl rand -base64 32) \
  CORS_ORIGINS="https://your-frontend.fly.dev" \
  NODE_ENV=production
```

#### Auto-Provided Variables:
```env
FLY_APP_NAME=hyperlocal-backend
FLY_REGION=lax
FLY_PUBLIC_IP=xxx.xxx.xxx.xxx
```

---

### 5. Supabase (Database + Storage)

**Platform Type:** Backend-as-a-Service  
**Best For:** PostgreSQL database hosting  
**Free Tier:** 500MB DB, unlimited requests

#### Provides:
```env
# Connection String (from dashboard):
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# For storage (optional):
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### Where to Find:
- Dashboard → Project Settings → Database → Connection String (URI)
- Enable "Connection Pooling" for production

#### Features Included:
- Automatic backups
- Connection pooling
- SSL encryption
- PostGIS extension support
- Real-time subscriptions (if needed later)

---

### 6. Upstash (Redis)

**Platform Type:** Serverless Redis  
**Best For:** Redis caching  
**Free Tier:** 10,000 commands/day

#### Provides:
```env
# From Console (REST API section):
REDIS_URL=rediss://default:[password]@[region].upstash.io:6379
```

#### Where to Find:
- Console → Database → REST API → .env tab

#### Important Notes:
- Use `rediss://` (double 's') for TLS encryption
- REST API available as fallback
- Global replication available (paid tier)

---

## 🔒 Security Requirements by Variable

### Critical Secrets (NEVER expose in frontend):

1. **JWT_SECRET**
   - Where: Backend only
   - Generate: `openssl rand -base64 32`
   - Rotate: Every 90 days
   - Length: Minimum 32 characters

2. **DATABASE_URL**
   - Where: Backend only
   - Format: `postgresql://user:pass@host:port/db?sslmode=require`
   - Always use SSL in production

3. **REDIS_URL**
   - Where: Backend only
   - Format: `rediss://default:pass@host:port` (TLS)
   - Use TLS (`rediss://`) in production

4. **S3/Cloudinary Keys**
   - Where: Backend only
   - Never commit to Git
   - Use IAM roles when possible

### Public Configuration (Safe for frontend):

1. **NEXT_PUBLIC_API_URL**
   - Public: Safe to expose
   - Contains: Backend URL only
   - No secrets

2. **NEXT_PUBLIC_MAPBOX_TOKEN**
   - Public: Scoped API key
   - Restrict: By domain in Mapbox dashboard
   - Rate limited

3. **NEXT_PUBLIC_GA_ID**
   - Public: Analytics ID
   - No security risk

---

## 📝 Complete Setup Checklist

### Local Development:

```bash
# 1. Copy environment files
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.local.example backend/.env.local

# 2. Start Docker services
docker-compose up -d

# 3. Run migrations
docker exec hyperlocal-backend npx prisma migrate deploy

# 4. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Cloud Deployment (Recommended Stack):

```bash
# STEP 1: Supabase (Database)
1. Create project → Wait 2 minutes
2. Settings → Database → Copy Connection String
3. Save: DATABASE_URL=postgresql://...

# STEP 2: Upstash (Redis)
1. Create database → Select region
2. Console → Database → REST API → .env
3. Save: REDIS_URL=rediss://...

# STEP 3: Generate Secrets
openssl rand -base64 32  # Save as JWT_SECRET

# STEP 4: Railway (Backend)
1. New Project → Deploy from GitHub
2. Add variables:
   - DATABASE_URL (from Supabase)
   - REDIS_URL (from Upstash)
   - JWT_SECRET (generated)
   - CORS_ORIGINS=https://*.vercel.app
   - NODE_ENV=production
   - PORT=3001
   - H3_RESOLUTION=8
3. Deploy → Copy Railway URL

# STEP 5: Vercel (Frontend)
1. Import project → Set root: frontend
2. Add variables:
   - NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
   - NODE_ENV=production
3. Deploy → Copy Vercel URL

# STEP 6: Update CORS
1. Railway → Update CORS_ORIGINS
2. Add actual Vercel URL
3. Redeploy
```

---

## 🎯 Quick Reference: Variable Locations

### Variables Referenced in Code:

**Frontend:**
```typescript
// frontend/src/lib/api.ts
process.env.NEXT_PUBLIC_API_URL

// frontend/src/hooks/useSocket.ts
process.env.NEXT_PUBLIC_WS_URL
process.env.NEXT_PUBLIC_API_URL
```

**Backend:**
```typescript
// backend/src/main.ts
process.env.PORT
process.env.CORS_ORIGINS
process.env.NODE_ENV

// backend/src/gateway/gateway.ts
process.env.CORS_ORIGINS

// backend/src/redis/redis.service.ts
process.env.REDIS_URL
process.env.REDIS_HOST
process.env.REDIS_PORT
process.env.REDIS_PASSWORD

// backend/prisma/schema.prisma
env("DATABASE_URL")
```

---

## 🚨 Common Issues & Solutions

### Issue 1: CORS Error
```
Error: Access to fetch at 'https://backend.com/api' from origin 'https://frontend.com' 
has been blocked by CORS policy
```

**Solution:**
```env
# Backend: Ensure CORS_ORIGINS includes your frontend
CORS_ORIGINS=https://frontend.com,https://frontend-*.vercel.app
```

### Issue 2: Database Connection Failed
```
Error: P1001: Can't reach database server
```

**Solution:**
```env
# Check DATABASE_URL format and add SSL:
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# For Supabase, use connection pooling URL
```

### Issue 3: Redis Connection Timeout
```
Error: connect ETIMEDOUT
```

**Solution:**
```env
# Use TLS for cloud Redis:
REDIS_URL=rediss://default:pass@host:6379
# Note: Double 's' in rediss://

# Check firewall allows outbound on port 6379
```

### Issue 4: WebSocket Won't Connect
```
Error: WebSocket connection failed
```

**Solution:**
```env
# Frontend: Ensure WS_URL matches backend
NEXT_PUBLIC_WS_URL=https://your-backend.up.railway.app

# Backend: Check CORS allows WebSocket upgrade
CORS_ORIGINS=https://your-frontend.vercel.app
```

---

## 📞 Platform Support Links

| Platform | Documentation | Status Page |
|----------|--------------|-------------|
| Vercel | https://vercel.com/docs | https://www.vercel-status.com |
| Railway | https://docs.railway.app | https://status.railway.app |
| Render | https://render.com/docs | https://status.render.com |
| Fly.io | https://fly.io/docs | https://status.fly.io |
| Supabase | https://supabase.com/docs | https://status.supabase.com |
| Upstash | https://docs.upstash.com | https://status.upstash.com |

---

**Document Version:** 1.0.0  
**Last Updated:** December 7, 2025  
**Maintained By:** Cheverywhayer Team
