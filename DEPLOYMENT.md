# 🚀 Multi-Cloud Deployment Guide

This guide covers deploying Cheverywhayer to various cloud platforms with **free tier options**.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Option 1: Vercel + Railway + Supabase + Upstash (Recommended)](#option-1-vercel--railway--supabase--upstash-recommended)
  - [Option 2: Vercel + Render](#option-2-vercel--render)
  - [Option 3: Fly.io Full Stack](#option-3-flyio-full-stack)
  - [Option 4: Railway Full Stack](#option-4-railway-full-stack)
- [Environment Variables Reference](#environment-variables-reference)
- [Platform Comparison](#platform-comparison)
- [Post-Deployment Steps](#post-deployment-steps)

---

## Prerequisites

- Git repository (GitHub, GitLab, or Bitbucket)
- Node.js 20+ installed locally (for testing)
- PostgreSQL database URL
- Redis URL (optional for some platforms)

---

## Deployment Options

### Option 1: Vercel + Railway + Supabase + Upstash (Recommended)

**Best for:** Maximum free tier usage, high performance, easy scaling

**Cost:** $0/month (within free tier limits)

**Free Tier Limits:**
- Vercel: 100GB bandwidth/month, unlimited deployments
- Railway: $5 free credits/month (~500 hours runtime)
- Supabase: 500MB database, unlimited API requests
- Upstash: 10,000 Redis commands/day

#### Step 1: Setup Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project (select region closest to your users)
3. Wait for database to provision (~2 minutes)
4. Go to **Settings > Database**
5. Copy the **Connection string** (URI format)
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual database password
7. Recommended: Enable **Connection Pooling** for better performance
   - Go to **Database Settings > Connection Pooling**
   - Copy the pooled connection string for production use

#### Step 2: Setup Upstash (Redis)

1. Go to [upstash.com](https://upstash.com) and create account
2. Create new **Redis Database**
3. Select region closest to your backend
4. Click on your database
5. Go to **REST API** tab
6. Copy the **REDIS_URL** from the `.env` section
   ```
   rediss://default:xxxxx@us1-capital-firefly-12345.upstash.io:6379
   ```
7. **IMPORTANT:** Use `rediss://` (double 's') for TLS connection

#### Step 3: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and create account
2. Click **New Project** > **Deploy from GitHub repo**
3. Select your repository
4. Railway will detect the project structure
5. Click **Add variables** and add:
   ```env
   DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
   REDIS_URL=rediss://default:xxxxx@us1-capital-firefly-12345.upstash.io:6379
   JWT_SECRET=your-super-secret-key-change-this
   NODE_ENV=production
   PORT=3001
   CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
   H3_RESOLUTION=8
   ```
6. **Configure Build & Start:**
   - Root Directory: `/backend`
   - Build Command: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm run start:prod`
7. Click **Deploy**
8. Once deployed, copy your Railway URL: `https://your-app-name.up.railway.app`

#### Step 4: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and create account
2. Click **Add New > Project**
3. Import your GitHub repository
4. **Configure:**
   - Framework Preset: **Next.js**
   - Root Directory: `frontend`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
5. **Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app
   NEXT_PUBLIC_WS_URL=https://your-app-name.up.railway.app
   NODE_ENV=production
   ```
6. Click **Deploy**
7. Vercel will provide your URL: `https://your-app.vercel.app`

#### Step 5: Update CORS in Railway

1. Go back to Railway dashboard
2. Update `CORS_ORIGINS` variable with your actual Vercel URL:
   ```env
   CORS_ORIGINS=https://your-app.vercel.app,https://your-app-*.vercel.app
   ```
3. Railway will automatically redeploy

✅ **Done!** Your app is now live at `https://your-app.vercel.app`

---

### Option 2: Vercel + Render

**Best for:** Simple deployment, no credit card required

**Cost:** $0/month (with limitations)

**Free Tier Limits:**
- Vercel: 100GB bandwidth/month
- Render: Free web services (spin down after 15 min inactivity)
- Render PostgreSQL: Free for 90 days

**Limitations:** Render free tier has cold starts (15-30 seconds) and limited database persistence.

#### Step 1: Setup Render PostgreSQL

1. Go to [render.com](https://render.com) and create account
2. Click **New +** > **PostgreSQL**
3. Name: `hyperlocal-db`
4. Region: Select closest to your users
5. Instance Type: **Free**
6. Click **Create Database**
7. Copy **External Database URL** (starts with `postgresql://`)

#### Step 2: Setup Upstash Redis

Same as Option 1, Step 2 (or use Render Redis if available)

#### Step 3: Deploy Backend to Render

1. In Render dashboard, click **New +** > **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `hyperlocal-backend`
   - **Region:** Same as database
   - **Branch:** `main` or `master`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm run start:prod`
   - **Instance Type:** Free
4. **Environment Variables:**
   ```env
   DATABASE_URL=postgresql://user:pass@hostname/database
   REDIS_URL=rediss://default:xxxxx@hostname:6379
   JWT_SECRET=your-secret
   NODE_ENV=production
   PORT=10000
   CORS_ORIGINS=https://your-app.vercel.app
   H3_RESOLUTION=8
   ```
5. Click **Create Web Service**
6. Copy the Render URL: `https://your-app.onrender.com`

#### Step 4: Deploy Frontend to Vercel

Same as Option 1, Step 4 (use Render URL for `NEXT_PUBLIC_API_URL`)

⚠️ **Note:** Render free tier spins down after 15 minutes of inactivity. First request after spin-down takes 30+ seconds.

---

### Option 3: Fly.io Full Stack

**Best for:** Full control, Docker-based deployment, multi-region

**Cost:** $0/month (within free tier)

**Free Tier:** 3 shared VMs, 160GB bandwidth/month

#### Prerequisites

```bash
# Install flyctl
brew install flyctl  # macOS
# OR download from https://fly.io/docs/getting-started/installing-flyctl/

# Login
fly auth login
```

#### Step 1: Deploy Backend

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create `fly.toml`:
   ```toml
   app = "hyperlocal-backend"
   primary_region = "lax"

   [build]
     dockerfile = "../Dockerfile.backend"

   [env]
     PORT = "8080"
     NODE_ENV = "production"
     H3_RESOLUTION = "8"

   [[services]]
     internal_port = 8080
     protocol = "tcp"

     [[services.ports]]
       handlers = ["http"]
       port = 80

     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443

     [[services.http_checks]]
       interval = "10s"
       timeout = "2s"
       path = "/health"
   ```

3. Create Postgres database:
   ```bash
   fly postgres create --name hyperlocal-db --region lax
   fly postgres attach hyperlocal-db
   ```

4. Create Redis:
   ```bash
   fly redis create --name hyperlocal-redis --region lax
   ```

5. Set secrets:
   ```bash
   fly secrets set JWT_SECRET=$(openssl rand -base64 32)
   fly secrets set CORS_ORIGINS="https://your-frontend.fly.dev"
   ```

6. Deploy:
   ```bash
   fly deploy
   ```

#### Step 2: Deploy Frontend

1. Navigate to frontend:
   ```bash
   cd ../frontend
   ```

2. Create `fly.toml`:
   ```toml
   app = "hyperlocal-frontend"
   primary_region = "lax"

   [build]
     dockerfile = "../Dockerfile.frontend"
     [build.args]
       NEXT_PUBLIC_API_URL = "https://hyperlocal-backend.fly.dev"

   [env]
     PORT = "3000"
     NODE_ENV = "production"

   [[services]]
     internal_port = 3000
     protocol = "tcp"

     [[services.ports]]
       handlers = ["http"]
       port = 80

     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

3. Deploy:
   ```bash
   fly deploy
   ```

✅ Your app is live at `https://hyperlocal-frontend.fly.dev`

---

### Option 4: Railway Full Stack

**Best for:** Simplest deployment, automatic everything

**Cost:** $5 free credits/month (enough for small apps)

#### Step 1: Deploy Everything

1. Go to [railway.app](https://railway.app)
2. Click **New Project** > **Deploy from GitHub repo**
3. Select repository
4. Railway auto-detects and creates services
5. Add **PostgreSQL** plugin (click **+ New**)
6. Add **Redis** plugin (click **+ New**)
7. Configure environment variables in each service
8. Deploy

Railway automatically:
- Provisions databases
- Generates URLs
- Configures networking
- Deploys on every git push

---

## Environment Variables Reference

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | ✅ | Redis connection string | `rediss://default:pass@host:6379` |
| `JWT_SECRET` | ✅ | Secret for signing JWTs | Generate with `openssl rand -base64 32` |
| `CORS_ORIGINS` | ✅ | Allowed frontend origins (comma-separated) | `https://app.vercel.app,https://app-*.vercel.app` |
| `PORT` | ❌ | Server port (auto-set by platforms) | `3001` |
| `NODE_ENV` | ❌ | Environment mode | `production` |
| `H3_RESOLUTION` | ❌ | H3 hexagon resolution | `8` (default) |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL | `https://api.example.com` |
| `NEXT_PUBLIC_WS_URL` | ❌ | WebSocket URL (defaults to API_URL) | `https://api.example.com` |
| `NODE_ENV` | ❌ | Environment mode | `production` |

---

## Platform Comparison

| Feature | Vercel + Railway | Vercel + Render | Fly.io | Railway |
|---------|-----------------|-----------------|---------|---------|
| **Setup Difficulty** | Easy | Easy | Medium | Very Easy |
| **Free Tier** | Excellent | Good | Good | Good |
| **Cold Starts** | None | 15-30s (Render) | None | None |
| **Auto-Scaling** | ✅ | Limited | ✅ | ✅ |
| **Custom Domains** | ✅ | ✅ | ✅ | ✅ |
| **Database Backup** | Manual | Manual | Manual | Auto |
| **Best For** | Production | Prototypes | Advanced users | Beginners |

---

## Post-Deployment Steps

### 1. Run Database Migrations

After first deployment, run migrations:

**Railway/Render:**
```bash
# In backend container/shell
npx prisma migrate deploy
```

**Fly.io:**
```bash
fly ssh console -a hyperlocal-backend
npx prisma migrate deploy
```

### 2. Test Your Deployment

1. Visit frontend URL
2. Register a new account
3. Verify email/password login
4. Test posting to a region
5. Test real-time updates (open in 2 browsers)
6. Test direct messaging

### 3. Setup Custom Domain (Optional)

**Vercel:**
1. Go to Project Settings > Domains
2. Add your domain
3. Update DNS records as instructed

**Railway/Render/Fly.io:**
1. Go to project settings
2. Add custom domain
3. Update CNAME record

### 4. Enable Analytics (Optional)

Add to Vercel environment variables:
```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX  # Google Analytics
```

### 5. Setup Monitoring

**Recommended tools:**
- [Sentry](https://sentry.io) - Error tracking (free tier available)
- [Uptime Robot](https://uptimerobot.com) - Uptime monitoring (free)
- [Better Stack](https://betterstack.com) - Logs & monitoring

---

## Troubleshooting

### CORS Errors

Ensure `CORS_ORIGINS` includes your frontend URL(s):
```env
CORS_ORIGINS=https://app.vercel.app,https://app-*.vercel.app
```

### Database Connection Errors

1. Verify `DATABASE_URL` format:
   ```
   postgresql://username:password@hostname:port/database
   ```
2. Check if database allows external connections
3. Verify SSL mode (add `?sslmode=require` if needed)

### WebSocket Not Connecting

1. Check `NEXT_PUBLIC_WS_URL` matches backend URL
2. Verify backend supports WebSocket upgrade
3. Check for firewall/proxy blocking WebSocket

### Build Failures

1. Check Node.js version (should be 20+)
2. Verify all dependencies in `package.json`
3. Check build logs for specific errors
4. Ensure Prisma client is generated during build

---

## Cost Optimization

### Free Tier Limits

- **Vercel:** 100GB bandwidth/month (enough for ~1000 daily users)
- **Railway:** $5 credits/month (~500 server hours)
- **Supabase:** 500MB database, unlimited requests
- **Upstash:** 10,000 Redis commands/day

### Reduce Costs

1. **Use Redis sparingly:** Cache only essential data
2. **Optimize images:** Use CDN for static assets
3. **Database indexing:** Ensure proper indexes on frequently queried fields
4. **Connection pooling:** Enable in Supabase/Postgres
5. **Limit WebSocket connections:** Implement reconnection backoff

### When to Upgrade

Upgrade when you exceed:
- 1000+ daily active users
- 10GB+ database
- 50,000+ Redis commands/day
- Need 99.9% uptime SLA

**Estimated cost at scale:**
- Railway: $20-50/month (5000 users)
- Render: $25-75/month (5000 users)
- Fly.io: $30-100/month (5000 users)

---

## Support

For deployment issues:
- Check platform documentation (Vercel, Railway, Render, Fly.io)
- Review error logs in platform dashboard
- Open GitHub issue for app-specific problems

**Good luck with your deployment! 🚀**
