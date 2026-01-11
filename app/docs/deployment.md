# Production Deployment Guide - Fast Food Loyalty System

This guide covers deploying the complete loyalty system (backend API + PostgreSQL database + frontend) to production.

## Overview

**Architecture:**
- **Backend:** Node.js/Express API with Prisma ORM
- **Database:** PostgreSQL
- **Frontend:** React/Vite application
- **Hosting:** Railway.app (recommended) or Render.com

---

## Option 1: Railway.app Deployment (Recommended - Easiest)

Railway provides the simplest deployment with automatic PostgreSQL and Node.js setup.

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Login" and sign in with GitHub
3. Verify your email address
4. You get $5 free credit per month (no credit card required)

### Step 2: Deploy Backend + Database

#### 2.1 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not already connected
4. Select your repository
5. Railway will detect the monorepo structure

#### 2.2 Add PostgreSQL Database

1. In your project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Wait for database to provision (~30 seconds)
4. Click on the PostgreSQL service
5. Go to "Variables" tab
6. Copy the `DATABASE_URL` value (you'll need this)

#### 2.3 Configure Backend Service

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Configure the service:
   - **Root Directory:** `/backend` (if monorepo)
   - **Build Command:** `pnpm install && pnpm run prisma:generate && pnpm run build`
   - **Start Command:** `pnpm run prisma:migrate deploy && pnpm run seed && pnpm start`

#### 2.4 Set Environment Variables

In the backend service, go to "Variables" tab and add:

```bash
# Database (automatically set by Railway if PostgreSQL is in same project)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=<your-generated-secret-32-chars>
JWT_REFRESH_SECRET=<your-generated-refresh-secret-32-chars>

# Server
PORT=3001
NODE_ENV=production

# CORS (update after deploying frontend)
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

**To generate secure secrets on Mac/Linux:**
```bash
openssl rand -base64 32
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

#### 2.5 Deploy Backend

1. Click "Deploy" or push to GitHub (auto-deploys)
2. Wait for build to complete (~2-3 minutes)
3. Check logs for any errors
4. Your backend will be available at: `https://your-project.railway.app`

#### 2.6 Get Backend URL

1. Click on your backend service
2. Go to "Settings" tab
3. Under "Domains", click "Generate Domain"
4. Copy the generated URL (e.g., `https://loyalty-backend-production.railway.app`)
5. This is your `BACKEND_API_URL`

### Step 3: Deploy Frontend to Vercel

#### 3.1 Prepare Frontend

1. Update `/workspace/app/frontend/.env`:
```bash
VITE_API_BASE_URL=https://your-backend-url.railway.app/api
```

2. Rebuild frontend locally to test:
```bash
cd /workspace/app/frontend
pnpm run build
```

#### 3.2 Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` (if monorepo)
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

6. Add Environment Variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-backend-url.railway.app/api`

7. Click "Deploy"
8. Wait for deployment (~1-2 minutes)
9. Your frontend will be at: `https://your-app.vercel.app`

#### 3.3 Update Backend CORS

1. Go back to Railway backend service
2. Update `CORS_ORIGIN` environment variable:
```bash
CORS_ORIGIN=https://your-app.vercel.app
```
3. Redeploy backend (or it will auto-redeploy)

### Step 4: Verify Deployment

#### 4.1 Test Backend API

```bash
# Health check
curl https://your-backend-url.railway.app/health

# Test login
curl -X POST https://your-backend-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loyaltyId":"ADMIN001","pinCode":"12345678"}'
```

Expected response: JWT tokens and user data

#### 4.2 Test Frontend

1. Open `https://your-app.vercel.app` in browser
2. Try logging in with demo account:
   - Loyalty ID: `ADMIN001`
   - PIN Code: `12345678`
3. Verify you can see the admin dashboard

#### 4.3 Test Cross-Device Sync

1. **Desktop:** Login at `https://your-app.vercel.app`
2. **Mobile:** Open same URL on phone browser
3. **iPad:** Open same URL on iPad browser
4. Verify:
   - All devices can login
   - Data syncs across devices
   - Admin changes appear on customer devices
   - Customer actions appear on admin device

---

## Option 2: Render.com Deployment

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Verify email

### Step 2: Create PostgreSQL Database

1. Click "New +" → "PostgreSQL"
2. Configure:
   - **Name:** loyalty-db
   - **Database:** loyalty_db
   - **User:** loyalty_user
   - **Region:** Choose closest to your users
   - **Plan:** Free (or paid for production)
3. Click "Create Database"
4. Wait for provisioning (~1 minute)
5. Copy "Internal Database URL" from dashboard

### Step 3: Deploy Backend

1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Configure:
   - **Name:** loyalty-backend
   - **Environment:** Node
   - **Region:** Same as database
   - **Branch:** main
   - **Root Directory:** `backend` (if monorepo)
   - **Build Command:** `pnpm install && pnpm run prisma:generate && pnpm run build`
   - **Start Command:** `pnpm run prisma:migrate deploy && pnpm run seed && pnpm start`
   - **Plan:** Free (or paid)

4. Add Environment Variables:
```bash
DATABASE_URL=<from PostgreSQL service>
JWT_SECRET=<generate secure string>
JWT_REFRESH_SECRET=<generate secure string>
PORT=3001
NODE_ENV=production
CORS_ORIGIN=<will update after frontend deploy>
```

5. Click "Create Web Service"
6. Wait for deployment (~3-5 minutes)
7. Your backend URL: `https://loyalty-backend.onrender.com`

### Step 4: Deploy Frontend

1. Update frontend `.env` with backend URL
2. Deploy to Vercel (same as Railway option above)
3. Update backend `CORS_ORIGIN` with frontend URL

---

## Production URLs

After successful deployment, you'll have:

**Backend API:**
- Railway: `https://your-project.railway.app`
- Render: `https://loyalty-backend.onrender.com`

**Frontend App:**
- Vercel: `https://your-app.vercel.app`
- Netlify: `https://your-app.netlify.app`

**Database:**
- Managed by Railway or Render
- Connection string in environment variables

---

## Demo Accounts

After deployment, these accounts are available:

| Role | Loyalty ID | PIN Code | Points | Visits |
|------|-----------|----------|--------|--------|
| Admin | ADMIN001 | 12345678 | 0 | 0 |
| Customer | CUST001 | 11111111 | 85 | 12 |
| Customer | CUST002 | 22222222 | 140 | 25 |
| Customer | CUST003 | 33333333 | 220 | 45 |

---

## Monitoring & Maintenance

### View Logs

**Railway:**
1. Go to your project
2. Click on backend service
3. Go to "Deployments" tab
4. Click on latest deployment
5. View logs in real-time

**Render:**
1. Go to your web service
2. Click "Logs" tab
3. View real-time logs

### Database Management

**Railway:**
1. Click on PostgreSQL service
2. Click "Data" tab
3. Use built-in database browser

**Render:**
1. Click on PostgreSQL database
2. Use connection string to connect with tools like:
   - TablePlus
   - pgAdmin
   - DBeaver

### Update Application

**Railway:**
- Push to GitHub → Auto-deploys

**Render:**
- Push to GitHub → Auto-deploys
- Or manually trigger deploy from dashboard

### Run Migrations

If you update the database schema:

**Railway:**
1. Update `prisma/schema.prisma`
2. Push to GitHub
3. Railway runs migrations automatically on deploy

**Render:**
1. Update schema
2. Push to GitHub
3. Migrations run automatically via start command

---

## Troubleshooting

### Backend Won't Start

**Check logs for:**
- Database connection errors → Verify DATABASE_URL
- Port conflicts → Railway/Render assign ports automatically
- Missing dependencies → Check package.json

**Solutions:**
```bash
# Rebuild with clean install
pnpm install --force
pnpm run build

# Reset database
pnpm run prisma:migrate reset
pnpm run seed
```

### CORS Errors

**Symptoms:** Frontend can't connect to backend

**Solution:**
1. Verify `CORS_ORIGIN` matches frontend URL exactly
2. No trailing slash in URL
3. Include protocol (https://)
4. Redeploy backend after changing

### Database Connection Issues

**Check:**
- DATABASE_URL format: `postgresql://user:pass@host:port/db?schema=public`
- Database is running
- Firewall allows connections
- SSL mode if required

### Frontend Can't Reach Backend

**Check:**
1. `VITE_API_BASE_URL` is correct
2. Backend is deployed and running
3. CORS is configured correctly
4. Rebuild frontend after changing env vars

### Token Expiration Issues

**Symptoms:** Users logged out frequently

**Solution:**
- Verify JWT_SECRET and JWT_REFRESH_SECRET are set
- Check token expiry times in backend code
- Ensure refresh token logic works

---

## Security Checklist

- ✅ Strong JWT secrets (32+ characters, random)
- ✅ HTTPS enabled (automatic on Railway/Render/Vercel)
- ✅ Correct CORS_ORIGIN (no wildcards in production)
- ✅ Environment variables not committed to Git
- ✅ Database credentials secure
- ✅ Regular dependency updates
- ✅ Database backups enabled

---

## Cost Estimates

### Railway (Recommended)

**Free Tier:**
- $5 credit per month
- ~500 hours of usage
- PostgreSQL included
- Suitable for testing/small production

**Pro Plan ($20/month):**
- Unlimited usage
- Better performance
- Priority support

### Render

**Free Tier:**
- Backend: Free (spins down after inactivity)
- Database: Free (expires after 90 days)
- Suitable for testing only

**Paid Plans:**
- Starter: $7/month per service
- PostgreSQL: $7/month
- Total: ~$14/month minimum

### Vercel (Frontend)

**Free Tier:**
- Unlimited deployments
- 100GB bandwidth
- Perfect for this project

---

## Backup Strategy

### Automatic Backups

**Railway:**
- Daily automatic backups (Pro plan)
- Point-in-time recovery

**Render:**
- Daily backups on paid plans
- Manual backups available

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup-20240111.sql
```

---

## Scaling Considerations

### Current Setup (Small Scale)
- Handles ~1000 concurrent users
- ~10,000 requests per day
- Single server instance

### To Scale Up:

**Railway:**
1. Upgrade to Pro plan
2. Increase instance resources
3. Add horizontal scaling

**Database:**
1. Enable connection pooling
2. Add read replicas
3. Optimize queries

**Frontend:**
- Vercel scales automatically
- No action needed

---

## Support & Resources

**Railway:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

**Render:**
- Docs: https://render.com/docs
- Support: support@render.com
- Status: https://status.render.com

**Vercel:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support
- Status: https://vercel-status.com

---

## Quick Reference Commands

```bash
# Generate JWT secrets
openssl rand -base64 32

# Test backend health
curl https://your-backend-url/health

# Test login
curl -X POST https://your-backend-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loyaltyId":"ADMIN001","pinCode":"12345678"}'

# View backend logs (Railway CLI)
railway logs

# View backend logs (Render CLI)
render logs

# Rebuild frontend
cd frontend && pnpm run build

# Deploy frontend (Vercel CLI)
vercel --prod
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Backend code tested locally
- [ ] Frontend code tested locally
- [ ] Database schema finalized
- [ ] Environment variables prepared
- [ ] JWT secrets generated

### Backend Deployment
- [ ] Railway/Render account created
- [ ] PostgreSQL database created
- [ ] DATABASE_URL obtained
- [ ] Backend service deployed
- [ ] Environment variables set
- [ ] Migrations run successfully
- [ ] Seed data loaded
- [ ] Backend URL obtained
- [ ] Health endpoint responding

### Frontend Deployment
- [ ] Backend URL added to .env
- [ ] Frontend built successfully
- [ ] Vercel account created
- [ ] Frontend deployed
- [ ] Frontend URL obtained
- [ ] CORS updated on backend

### Testing
- [ ] Backend health check passes
- [ ] Login works on desktop
- [ ] Login works on mobile
- [ ] Login works on iPad
- [ ] Data syncs across devices
- [ ] Admin panel functional
- [ ] Customer features work
- [ ] Coupon system works

### Documentation
- [ ] Production URLs documented
- [ ] Demo accounts documented
- [ ] Troubleshooting guide ready
- [ ] Team notified of deployment

---

## Conclusion

Your Fast Food Loyalty System is now deployed to production! Users can access it from any device (PC, mobile, iPad) and data syncs automatically across all devices.

**Production URLs:**
- Frontend: `https://your-app.vercel.app`
- Backend API: `https://your-backend.railway.app`

**Next Steps:**
1. Share URLs with users
2. Monitor logs for issues
3. Set up alerts for downtime
4. Plan regular backups
5. Schedule maintenance windows

For issues or questions, refer to the Troubleshooting section or contact support.