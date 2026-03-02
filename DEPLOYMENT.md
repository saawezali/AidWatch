# AidWatch Deployment Guide

Deploy AidWatch for free using **Vercel** (frontend), **Render** (API), and **Supabase** (database).

## Prerequisites

- GitHub account (for automated deployments)
- [Supabase](https://supabase.com) account (free)
- [Vercel](https://vercel.com) account (free)
- [Render](https://render.com) account (free)
- [Groq](https://console.groq.com) API key (free tier: 14,400 requests/day)
- [NewsAPI](https://newsapi.org) key (free tier: 100 requests/day)

---

## Step 1: Set Up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name:** `aidwatch`
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users
4. Wait for project to be created (~2 minutes)
5. Go to **Settings** → **Database** → **Connection string**
6. Copy the **URI** under "Transaction" pooler (looks like):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

## Step 2: Deploy API on Render

### Option A: One-Click Deploy (Recommended)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo
5. Render will detect `render.yaml` and set up the service
6. Configure environment variables:
   - `DATABASE_URL`: Your Supabase connection string from Step 1
   - `GROQ_API_KEY`: From [Groq Console](https://console.groq.com/keys)
   - `NEWS_API_KEY`: From [NewsAPI](https://newsapi.org/account)
   - `ADMIN_API_KEY`: Generate with `openssl rand -hex 32`
   - `APP_URL`: Leave empty for now (update after Vercel deploy)

### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `aidwatch-api`
   - **Root Directory:** `packages/api`
   - **Runtime:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm run db:migrate:prod && npm start`
5. Add environment variables (same as Option A)
6. Click **Create Web Service**

### After Deployment

Note your API URL (e.g., `https://aidwatch-api.onrender.com`)

---

## Step 3: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `packages/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: Your Render API URL (e.g., `https://aidwatch-api.onrender.com`)
6. Click **Deploy**

### After Deployment

1. Note your frontend URL (e.g., `https://aidwatch.vercel.app`)
2. Go back to Render and update:
   - `APP_URL`: Your Vercel frontend URL

---

## Step 4: Run Database Migrations

The first deployment on Render will automatically run migrations. If you need to run them manually:

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your-supabase-connection-string"

# Run migrations
cd packages/api
npx prisma migrate deploy
```

---

## Step 5: Verify Deployment

1. **Health Check:** Visit `https://your-api.onrender.com/api/health`
2. **API Docs:** Visit `https://your-api.onrender.com/api/docs`
3. **Frontend:** Visit your Vercel URL
4. **Demo Mode:** Try the dashboard without logging in

---

## Environment Variables Summary

### Render (API)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | Groq API key for AI analysis |
| `NEWS_API_KEY` | ✅ | NewsAPI key for data ingestion |
| `ADMIN_API_KEY` | ✅ | Admin authentication key |
| `JWT_ACCESS_SECRET` | ✅ | Secret for JWT access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for JWT refresh tokens |
| `APP_URL` | ✅ | Frontend URL (Vercel) |
| `NODE_ENV` | ✅ | `production` |
| `API_PORT` | ✅ | `10000` (Render default) |
| `ENABLE_EMAIL_NOTIFICATIONS` | ❌ | `false` (disabled for v1) |

### Generating Secrets

**PowerShell:**
```powershell
# Generate ADMIN_API_KEY
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])

# Generate JWT secrets (run twice for access and refresh)
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
```

**Bash/Linux/macOS:**
```bash
# ADMIN_API_KEY
openssl rand -hex 32

# JWT secrets
openssl rand -hex 64
```

### Vercel (Frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | API URL (Render) |

---

## Free Tier Limits

| Service | Limit | Notes |
|---------|-------|-------|
| **Supabase** | 500MB database, 2GB bandwidth | Generous for MVP |
| **Vercel** | Unlimited static hosting | No cold start |
| **Render** | 750 hours/month, spins down after 15min | ~3s cold start |
| **Groq** | 14,400 requests/day | Configured for ~400/day |
| **NewsAPI** | 100 requests/day | Free tier limitation |

---

## Troubleshooting

### API Returns 502/503
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~3-5 seconds
- Consider upgrading to paid tier ($7/month) for always-on

### Database Connection Errors
- Ensure you're using the **Transaction pooler** connection string from Supabase
- Add `?pgbouncer=true` to connection string if not present

### CORS Errors
- Verify `APP_URL` in Render matches your Vercel URL exactly
- Include protocol: `https://aidwatch.vercel.app`

### Rate Limit Errors from Groq
- AI analysis is configured for ~400 calls/day
- If hitting limits, increase `AI_ANALYSIS_INTERVAL_MINUTES` or decrease `AI_BATCH_SIZE`

---

## Updating the Deployment

### Frontend (Vercel)
Push to `main` branch → Vercel automatically rebuilds

### Backend (Render)
Push to `main` branch → Render automatically rebuilds

### Database Schema Changes
```bash
# Create migration locally
cd packages/api
npx prisma migrate dev --name your_migration_name

# Commit and push - Render will run migrations on deploy
```

---

## Production Checklist

- [ ] Supabase project created
- [ ] DATABASE_URL set in Render
- [ ] GROQ_API_KEY set in Render
- [ ] NEWS_API_KEY set in Render
- [ ] ADMIN_API_KEY generated and set
- [ ] JWT_ACCESS_SECRET generated and set
- [ ] JWT_REFRESH_SECRET generated and set
- [ ] Frontend deployed on Vercel
- [ ] VITE_API_URL set in Vercel
- [ ] APP_URL updated in Render
- [ ] Health endpoint returning OK
- [ ] User registration working
- [ ] First data ingestion triggered

---

## Docker Deployment (Alternative)

A Dockerfile is included in `packages/api/` for container-based deployments.

### Build and Run Locally

```bash
cd packages/api
docker build -t aidwatch-api .
docker run -p 3001:3001 --env-file .env aidwatch-api
```

### Deploy to Railway

1. Go to [railway.app](https://railway.app) and connect GitHub
2. Select your repo, set **Root Directory** to `packages/api`
3. Railway auto-detects Dockerfile
4. Add environment variables in dashboard
5. Deploy

### Deploy to Fly.io

```bash
# Install flyctl and login
fly auth login

# Launch from packages/api directory  
cd packages/api
fly launch --name aidwatch-api

# Set secrets
fly secrets set DATABASE_URL="your-url" GROQ_API_KEY="your-key" ...

# Deploy
fly deploy
```
