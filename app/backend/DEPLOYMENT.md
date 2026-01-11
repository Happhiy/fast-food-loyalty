# Deployment Guide - Fast Food Loyalty System Backend

This guide covers deploying the backend API to production using Railway.app (recommended) or other platforms.

## Option 1: Railway.app (Recommended - Easiest)

Railway provides free PostgreSQL database and automatic deployments from GitHub.

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub account
3. Verify your email

### Step 2: Create New Project

1. Click "New Project"
2. Select "Provision PostgreSQL"
3. Wait for database to be created
4. Copy the `DATABASE_URL` from the PostgreSQL service

### Step 3: Add Backend Service

1. In the same project, click "New Service"
2. Select "GitHub Repo"
3. Connect your repository
4. Select the backend directory (if monorepo)

### Step 4: Configure Environment Variables

In the backend service settings, add these variables:

```
DATABASE_URL=<copied from PostgreSQL service>
JWT_SECRET=<generate secure random string>
JWT_REFRESH_SECRET=<generate another secure string>
PORT=3001
NODE_ENV=production
CORS_ORIGIN=<your frontend URL>
```

**Generate secure secrets:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 5: Configure Build & Start Commands

Railway auto-detects Node.js projects, but you can customize:

**Build Command:**
```
pnpm install && pnpm run prisma:generate && pnpm run build
```

**Start Command:**
```
pnpm run prisma:migrate deploy && pnpm run seed && pnpm start
```

### Step 6: Deploy

1. Push your code to GitHub
2. Railway will automatically deploy
3. Check logs for any errors
4. Your API will be available at: `https://your-project.railway.app`

### Step 7: Update Frontend CORS

Update your frontend to use the Railway backend URL:

```typescript
// frontend/src/lib/api.ts
const API_BASE_URL = 'https://your-project.railway.app/api';
```

---

## Option 2: Render.com

### Step 1: Create PostgreSQL Database

1. Go to https://render.com
2. Create new PostgreSQL database
3. Copy the "Internal Database URL"

### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name:** loyalty-backend
   - **Environment:** Node
   - **Build Command:** `cd backend && pnpm install && pnpm run prisma:generate && pnpm run build`
   - **Start Command:** `cd backend && pnpm run prisma:migrate deploy && pnpm run seed && pnpm start`

### Step 3: Add Environment Variables

```
DATABASE_URL=<from PostgreSQL service>
JWT_SECRET=<generate secure string>
JWT_REFRESH_SECRET=<generate secure string>
PORT=3001
NODE_ENV=production
CORS_ORIGIN=<your frontend URL>
```

### Step 4: Deploy

Render will automatically deploy when you push to GitHub.

---

## Option 3: Heroku

### Step 1: Install Heroku CLI

```bash
npm install -g heroku
heroku login
```

### Step 2: Create App and Database

```bash
cd /workspace/app/backend
heroku create loyalty-backend
heroku addons:create heroku-postgresql:mini
```

### Step 3: Set Environment Variables

```bash
heroku config:set JWT_SECRET="your-secret"
heroku config:set JWT_REFRESH_SECRET="your-refresh-secret"
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN="https://your-frontend.com"
```

### Step 4: Deploy

```bash
git push heroku main
heroku run pnpm run prisma:migrate deploy
heroku run pnpm run seed
```

---

## Option 4: Supabase (Database Only) + Vercel (Backend)

### Supabase Setup

1. Go to https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy the connection string (URI mode)
5. Replace `[YOUR-PASSWORD]` with your database password

### Vercel Setup

1. Install Vercel CLI: `npm install -g vercel`
2. In backend directory: `vercel`
3. Set environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

---

## Database Migration in Production

### First Deployment

The start command includes migration and seed:
```bash
pnpm run prisma:migrate deploy && pnpm run seed && pnpm start
```

### Subsequent Deployments

If you change the schema:

1. Create migration locally:
```bash
pnpm run prisma:migrate dev --name your_migration_name
```

2. Commit the migration files to Git

3. Push to GitHub - Railway/Render will auto-deploy and run migrations

### Manual Migration

If needed, run migrations manually:

**Railway:**
```bash
railway run pnpm run prisma:migrate deploy
```

**Heroku:**
```bash
heroku run pnpm run prisma:migrate deploy
```

---

## Monitoring & Logs

### Railway

- View logs in the Railway dashboard
- Set up log drains for external monitoring

### Render

- View logs in the Render dashboard
- Enable persistent logs in settings

### Heroku

```bash
heroku logs --tail
```

---

## Health Check

All platforms should monitor this endpoint:

```
GET https://your-backend-url.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-11T10:00:00.000Z"
}
```

---

## Scaling

### Railway

- Upgrade to Pro plan for more resources
- Horizontal scaling available on Pro

### Render

- Upgrade instance type in service settings
- Add more instances for horizontal scaling

### Heroku

```bash
heroku ps:scale web=2
```

---

## Backup Strategy

### Automated Backups

**Railway:** Automatic daily backups included

**Render:** Automatic backups on paid plans

**Heroku:** Automatic backups with Premium plans

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

## Security Checklist

- ✅ Use strong JWT secrets (32+ characters)
- ✅ Enable HTTPS only (automatic on Railway/Render/Heroku)
- ✅ Set correct CORS_ORIGIN
- ✅ Keep dependencies updated
- ✅ Enable database connection pooling
- ✅ Set up monitoring and alerts
- ✅ Regular database backups
- ✅ Use environment variables for all secrets

---

## Troubleshooting

### Database Connection Issues

Check your DATABASE_URL format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

### Migration Failures

Reset and re-run:
```bash
pnpm run prisma:migrate reset
pnpm run seed
```

### Port Conflicts

Railway/Render automatically assign ports. Don't hardcode PORT in production.

### CORS Errors

Ensure CORS_ORIGIN matches your frontend URL exactly (including protocol and no trailing slash).

---

## Cost Estimates

### Railway (Recommended)

- **Free Tier:** $5 credit/month
- **Pro Plan:** $20/month
- PostgreSQL: Included

### Render

- **Free Tier:** Available (with limitations)
- **Starter:** $7/month
- PostgreSQL: $7/month

### Heroku

- **Eco Plan:** $5/month
- PostgreSQL Mini: $5/month

---

## Support

For deployment issues:

- Railway: https://railway.app/help
- Render: https://render.com/docs
- Heroku: https://devcenter.heroku.com