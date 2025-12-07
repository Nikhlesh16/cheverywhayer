# 📋 Environment Variables & Credentials Checklist

## Required Credentials by Platform

This document lists ALL credentials you need to create in each cloud platform before deployment.

---

## 🎯 Option 1: Vercel + Railway + Supabase + Upstash (RECOMMENDED)

**Total Cost:** $0/month (within free tiers)  
**Setup Time:** ~20 minutes

### 1️⃣ Supabase (Database)

**Service:** PostgreSQL Database  
**Free Tier:** 500MB database, unlimited API requests  
**Website:** https://supabase.com

#### Credentials to Create:
```bash
# Login to Supabase Dashboard
1. Create new project
2. Go to: Settings > Database > Connection String

# YOU WILL GET:
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# IMPORTANT: 
- Replace [PASSWORD] with your actual database password
- Use the "Connection pooling" string for production
- Save this URL for Railway backend configuration
```

**Where to find:**
- Dashboard → Project Settings → Database → Connection String (URI)
- Enable "Connection Pooling" for better performance

---

### 2️⃣ Upstash (Redis Cache)

**Service:** Serverless Redis  
**Free Tier:** 10,000 commands/day, 256MB storage  
**Website:** https://upstash.com

#### Credentials to Create:
```bash
# Login to Upstash Console
1. Create new Redis database
2. Select region (closest to your users)
3. Go to: Database > REST API > .env tab

# YOU WILL GET:
REDIS_URL=rediss://default:[PASSWORD]@[REGION].upstash.io:6379

# IMPORTANT:
- Use rediss:// (double 's') for TLS/SSL
- Save this URL for Railway backend configuration
```

**Where to find:**
- Console → Your Database → REST API → .env section

---

### 3️⃣ Railway (Backend Hosting)

**Service:** Backend + Auto-deploy from Git  
**Free Tier:** $5 credits/month (~500 server hours)  
**Website:** https://railway.app

#### Credentials to Add:
```bash
# Railway Dashboard > Your Project > Variables

# From Supabase:
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# From Upstash:
REDIS_URL=rediss://default:[PASSWORD]@[REGION].upstash.io:6379

# Generate yourself (run in terminal):
# openssl rand -base64 32
JWT_SECRET=your-generated-secret-here

# Set these manually:
NODE_ENV=production
PORT=3001
H3_RESOLUTION=8

# Update after Vercel deployment:
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

**Railway will auto-provide:**
```bash
# These appear AFTER deployment:
RAILWAY_PUBLIC_DOMAIN=your-app-name.up.railway.app
RAILWAY_PRIVATE_NETWORK_DOMAIN=your-app-name.railway.internal

# Copy the public domain for Vercel frontend config
```

---

### 4️⃣ Vercel (Frontend Hosting)

**Service:** Next.js Frontend + CDN  
**Free Tier:** 100GB bandwidth/month  
**Website:** https://vercel.com

#### Credentials to Add:
```bash
# Vercel Dashboard > Project > Settings > Environment Variables

# From Railway (after backend is deployed):
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app

# Optional (defaults to API_URL if not set):
NEXT_PUBLIC_WS_URL=https://your-app-name.up.railway.app

# Environment:
NODE_ENV=production
```

**Set for which environments:**
- ✅ Production
- ✅ Preview
- ✅ Development (optional)

**Vercel will auto-provide:**
```bash
# After deployment:
VERCEL_URL=your-app.vercel.app
VERCEL_GIT_COMMIT_SHA=abc123...
VERCEL_ENV=production

# Copy your-app.vercel.app and update Railway CORS_ORIGINS
```

---

## 🎯 Option 2: Vercel + Render (Budget Option)

**Total Cost:** $0/month  
**Limitations:** Render free tier has 15-minute cold starts

### 1️⃣ Render PostgreSQL

**Service:** PostgreSQL Database  
**Free Tier:** Free for 90 days, then requires paid plan  
**Website:** https://render.com

#### Credentials to Create:
```bash
# Render Dashboard > New > PostgreSQL

# YOU WILL GET:
Internal Database URL: postgresql://user:password@hostname:5432/dbname
External Database URL: postgresql://user:password@hostname/dbname

# USE THE EXTERNAL URL for your backend
DATABASE_URL=postgresql://user:password@hostname/dbname
```

**Where to find:**
- Dashboard → Your Database → Connections → External Database URL

---

### 2️⃣ Upstash Redis
Same as Option 1 above

---

### 3️⃣ Render Web Service (Backend)

**Service:** Backend Hosting  
**Free Tier:** 750 hours/month, spins down after 15min inactivity  
**Website:** https://render.com

#### Credentials to Add:
```bash
# Render Dashboard > Web Service > Environment

# From Render PostgreSQL:
DATABASE_URL=postgresql://user:password@hostname/dbname

# From Upstash:
REDIS_URL=rediss://default:[PASSWORD]@[REGION].upstash.io:6379

# Generate:
JWT_SECRET=your-generated-secret

# Set:
NODE_ENV=production
PORT=10000
H3_RESOLUTION=8

# Update after Vercel:
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
```

**Render will auto-provide:**
```bash
# After deployment:
RENDER_SERVICE_NAME=your-app-name
RENDER_EXTERNAL_URL=https://your-app-name.onrender.com

# Copy for Vercel
```

---

### 4️⃣ Vercel Frontend
Same as Option 1, but use Render URL:
```bash
NEXT_PUBLIC_API_URL=https://your-app-name.onrender.com
```

---

## 🎯 Option 3: Fly.io Full Stack

**Total Cost:** $0/month (within free tier)  
**Free Tier:** 3 VMs, 160GB bandwidth  
**Website:** https://fly.io

### Setup via CLI:

```bash
# Install flyctl
brew install flyctl  # macOS
# or download from https://fly.io/docs/hands-on/install-flyctl/

# Login
fly auth login

# Create Postgres
fly postgres create --name hyperlocal-db --region lax

# Create Redis
fly redis create --name hyperlocal-redis --region lax

# Set secrets
fly secrets set \
  JWT_SECRET=$(openssl rand -base64 32) \
  CORS_ORIGINS="https://your-frontend.fly.dev"

# Deploy backend
cd backend
fly launch --name hyperlocal-backend

# Deploy frontend
cd ../frontend
fly launch --name hyperlocal-frontend
```

**Fly.io auto-provides:**
```bash
DATABASE_URL=postgresql://...@your-app-db.flycast:5432/your_db
REDIS_URL=redis://...@your-app-redis.flycast:6379
FLY_APP_NAME=hyperlocal-backend
FLY_REGION=lax
```

---

## 📊 Complete Environment Variables Matrix

| Variable | Local Docker | Railway | Render | Fly.io | Supabase | Upstash | Vercel |
|----------|-------------|---------|--------|--------|----------|---------|--------|
| `DATABASE_URL` | ✅ Manual | 🤖 Auto | ✅ Copy | 🤖 Auto | ✅ Copy | - | - |
| `REDIS_URL` | ✅ Manual | 🤖 Auto | - | 🤖 Auto | - | ✅ Copy | - |
| `REDIS_HOST` | ✅ Manual | - | - | - | - | - | - |
| `REDIS_PORT` | ✅ Manual | - | - | - | - | - | - |
| `JWT_SECRET` | ✅ Manual | ✅ Set | ✅ Set | ✅ Set | - | - | - |
| `JWT_EXPIRATION` | ✅ Manual | ✅ Set | ✅ Set | ✅ Set | - | - | - |
| `PORT` | ✅ Manual | ✅ Set | 🤖 Auto | ✅ Set | - | - | - |
| `NODE_ENV` | ✅ Manual | ✅ Set | ✅ Set | ✅ Set | - | - | ✅ Set |
| `CORS_ORIGINS` | ✅ Manual | ✅ Set | ✅ Set | ✅ Set | - | - | - |
| `H3_RESOLUTION` | ✅ Manual | ✅ Set | ✅ Set | ✅ Set | - | - | - |
| `NEXT_PUBLIC_API_URL` | ✅ Manual | - | - | - | - | - | ✅ Set |
| `NEXT_PUBLIC_WS_URL` | ✅ Manual | - | - | - | - | - | ✅ Set |

**Legend:**
- ✅ Manual = You set manually
- 🤖 Auto = Platform auto-provides
- ✅ Copy = Copy from another service
- ✅ Set = You must set this
- `-` = Not needed for this platform

---

## 🔐 Credential Security Checklist

### ✅ Before Deployment:

- [ ] Generate strong JWT_SECRET: `openssl rand -base64 32`
- [ ] Change all default passwords
- [ ] Use TLS for Redis (rediss://)
- [ ] Use SSL for PostgreSQL (?sslmode=require)
- [ ] Add `.env` to `.gitignore`
- [ ] Never commit secrets to Git

### ✅ After Deployment:

- [ ] Verify CORS origins match frontend URL
- [ ] Test WebSocket connections
- [ ] Check database connection pooling
- [ ] Monitor error logs for first 24 hours
- [ ] Set up backup strategy
- [ ] Enable 2FA on all cloud accounts

### ✅ Production Hardening:

- [ ] Rotate JWT_SECRET every 90 days
- [ ] Use different secrets for staging/production
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure rate limiting
- [ ] Enable DDoS protection (Cloudflare)
- [ ] Set up custom domain with SSL
- [ ] Configure database backups
- [ ] Set up uptime monitoring

---

## 🆘 Quick Troubleshooting

### Database Connection Fails:
```bash
# Check DATABASE_URL format:
postgresql://username:password@hostname:port/database

# Verify SSL mode (add to URL):
?sslmode=require

# Test connection:
psql $DATABASE_URL
```

### Redis Connection Fails:
```bash
# Check REDIS_URL format:
rediss://default:password@hostname:port  # Note: rediss with double 's'

# Test connection:
redis-cli -u $REDIS_URL ping
```

### CORS Errors:
```bash
# Ensure CORS_ORIGINS includes your frontend:
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app

# Check for typos in URLs (https vs http)
```

### WebSocket Won't Connect:
```bash
# Verify NEXT_PUBLIC_WS_URL matches backend:
NEXT_PUBLIC_WS_URL=https://your-backend.up.railway.app

# Check backend supports WebSocket upgrade
# Check for proxy/firewall blocking WebSocket
```

---

## 📞 Support Contacts

**Supabase:** https://supabase.com/docs  
**Upstash:** https://docs.upstash.com  
**Railway:** https://docs.railway.app  
**Render:** https://render.com/docs  
**Vercel:** https://vercel.com/docs  
**Fly.io:** https://fly.io/docs  

**Project Issues:** https://github.com/Nikhlesh16/cheverywhayer/issues

---

**Last Updated:** December 2025  
**Version:** 1.0.0
