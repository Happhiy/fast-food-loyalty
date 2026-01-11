# Quick Start Guide - Backend Setup

Get the backend running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- PostgreSQL installed (local or cloud)

## Option A: Local PostgreSQL (Recommended for Development)

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE loyalty_db;
CREATE USER loyalty_user WITH PASSWORD 'loyalty_pass';
GRANT ALL PRIVILEGES ON DATABASE loyalty_db TO loyalty_user;
\q
```

### 3. Update .env

The `.env` file is already created. Update if needed:

```env
DATABASE_URL="postgresql://loyalty_user:loyalty_pass@localhost:5432/loyalty_db?schema=public"
```

### 4. Run Migrations and Seed

```bash
cd /workspace/app/backend

# Generate Prisma Client
pnpm run prisma:generate

# Run migrations
pnpm run prisma:migrate

# Seed database
pnpm run seed
```

### 5. Start Server

```bash
pnpm run dev
```

Server will start at `http://localhost:3001`

### 6. Test API

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loyaltyId":"ADMIN001","pinCode":"12345678"}'
```

---

## Option B: Cloud PostgreSQL (Supabase - Free)

### 1. Create Supabase Account

1. Go to https://supabase.com
2. Sign up with GitHub
3. Create new project
4. Wait for database to be ready (~2 minutes)

### 2. Get Connection String

1. Go to Project Settings → Database
2. Copy the "URI" connection string
3. Replace `[YOUR-PASSWORD]` with your database password

### 3. Update .env

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?schema=public"
```

### 4. Run Migrations and Seed

```bash
cd /workspace/app/backend

pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run seed
```

### 5. Start Server

```bash
pnpm run dev
```

---

## Option C: Railway (Free - Easiest Cloud Setup)

### 1. Create Railway Account

Go to https://railway.app and sign up

### 2. Create Project with PostgreSQL

1. Click "New Project"
2. Select "Provision PostgreSQL"
3. Copy the DATABASE_URL from the PostgreSQL service

### 3. Update .env

```env
DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"
```

### 4. Run Setup

```bash
cd /workspace/app/backend

pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run seed
pnpm run dev
```

---

## Verify Setup

### 1. Check Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-11T10:00:00.000Z"}
```

### 2. Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"loyaltyId":"ADMIN001","pinCode":"12345678"}'
```

You should get an access token and user data.

### 3. View Database

```bash
pnpm run prisma:studio
```

Opens at `http://localhost:5555` - you can view and edit data here.

---

## Demo Accounts

After seeding, these accounts are available:

| Role | Loyalty ID | PIN Code | Points | Visits |
|------|-----------|----------|--------|--------|
| Admin | ADMIN001 | 12345678 | 0 | 0 |
| Customer | CUST001 | 11111111 | 85 | 12 |
| Customer | CUST002 | 22222222 | 140 | 25 |
| Customer | CUST003 | 33333333 | 220 | 45 |

---

## Next Steps

1. **Test API Endpoints** - Use Postman or curl to test all endpoints
2. **Connect Frontend** - Update frontend to use `http://localhost:3001/api`
3. **Deploy** - Follow DEPLOYMENT.md to deploy to production

---

## Troubleshooting

### "Cannot connect to database"

Check if PostgreSQL is running:
```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Windows
# Check Services app
```

### "Prisma Client not generated"

Run:
```bash
pnpm run prisma:generate
```

### "Port 3001 already in use"

Change PORT in .env:
```env
PORT=3002
```

### "Migration failed"

Reset database:
```bash
pnpm run prisma:migrate reset
pnpm run seed
```

---

## Useful Commands

```bash
# Development
pnpm run dev              # Start dev server with hot reload

# Database
pnpm run prisma:studio    # Open database GUI
pnpm run prisma:migrate   # Run migrations
pnpm run seed             # Seed database

# Production
pnpm run build            # Build TypeScript
pnpm start                # Start production server

# Maintenance
pnpm run prisma:migrate reset  # Reset database
```

---

## Need Help?

- Check README.md for full API documentation
- Check DEPLOYMENT.md for production setup
- Open an issue on GitHub