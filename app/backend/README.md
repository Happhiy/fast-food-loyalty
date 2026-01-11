# Fast Food Loyalty System - Backend API

Backend REST API for the Fast Food Loyalty System, built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (Admin, Owner, Loyal, Normal)
- ✅ Automatic point calculation based on customer role
- ✅ Automatic role upgrades (20 visits → Loyal, 50 visits → Owner)
- ✅ Coupon creation and redemption system
- ✅ Purchase tracking with receipt numbers
- ✅ Secure PIN code storage with bcrypt
- ✅ Input validation with Zod
- ✅ PostgreSQL database with Prisma ORM

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (local or cloud)

## Setup Instructions

### 1. Install Dependencies

```bash
cd /workspace/app/backend
pnpm install
```

### 2. Configure Environment

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and set your database URL and JWT secrets:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/loyalty_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

### 3. Set Up Database

Generate Prisma client:

```bash
pnpm run prisma:generate
```

Run database migrations:

```bash
pnpm run prisma:migrate
```

Seed the database with demo data:

```bash
pnpm run seed
```

### 4. Start Development Server

```bash
pnpm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

#### POST /api/auth/login
Login with loyalty ID and PIN code.

**Request:**
```json
{
  "loyaltyId": "CUST001",
  "pinCode": "11111111"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "loyaltyId": "CUST001",
    "name": "Nagy Péter",
    "email": "peter.nagy@email.hu",
    "phone": "+36301111111",
    "points": 85,
    "visitCount": 12,
    "role": "NORMAL"
  }
}
```

#### POST /api/auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### GET /api/auth/me
Get current user info (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

### Customers

#### GET /api/customers
Get all customers (admin only).

**Headers:**
```
Authorization: Bearer <accessToken>
```

#### GET /api/customers/:id
Get customer by ID.

**Headers:**
```
Authorization: Bearer <accessToken>
```

#### POST /api/customers
Create new customer (admin only).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+36301234567",
  "pinCode": "12345678"
}
```

**Response:**
```json
{
  "id": "...",
  "loyaltyId": "CUST004",
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+36301234567",
  "points": 0,
  "totalSpent": 0,
  "visitCount": 0,
  "role": "NORMAL",
  "createdAt": "2024-01-11T10:00:00.000Z",
  "pinCode": "12345678"
}
```

#### PUT /api/customers/:id
Update customer.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "name": "Updated Name",
  "points": 150,
  "role": "LOYAL"
}
```

#### DELETE /api/customers/:id
Delete customer (admin only).

**Headers:**
```
Authorization: Bearer <accessToken>
```

### Purchases

#### POST /api/purchases
Record a new purchase (admin only).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "customerId": "...",
  "amount": 2500,
  "receiptNumber": "RCP-004"
}
```

**Response:**
```json
{
  "purchase": {
    "id": "...",
    "customerId": "...",
    "amount": 2500,
    "pointsEarned": 27,
    "receiptNumber": "RCP-004",
    "timestamp": "2024-01-11T10:00:00.000Z"
  },
  "customer": {
    "points": 112,
    "visitCount": 13,
    "role": "NORMAL"
  }
}
```

#### GET /api/purchases/:customerId
Get customer's purchase history.

**Headers:**
```
Authorization: Bearer <accessToken>
```

### Coupons

#### POST /api/coupons
Create a coupon (deducts 100 points).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "customerId": "..."
}
```

**Response:**
```json
{
  "id": "...",
  "code": "COUP-2024-003",
  "customerId": "...",
  "value": 1000,
  "createdAt": "2024-01-11T10:00:00.000Z",
  "redeemed": false
}
```

#### GET /api/coupons/:customerId
Get customer's coupons.

**Headers:**
```
Authorization: Bearer <accessToken>
```

#### POST /api/coupons/lookup
Lookup coupon by code (admin only).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "code": "COUP-2024-001"
}
```

**Response:**
```json
{
  "id": "...",
  "code": "COUP-2024-001",
  "customerId": "...",
  "value": 1000,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "redeemed": false,
  "customer": {
    "id": "...",
    "loyaltyId": "CUST002",
    "name": "Kovács Anna",
    "phone": "+36302222222"
  }
}
```

#### PUT /api/coupons/:code/redeem
Redeem a coupon (admin only).

**Headers:**
```
Authorization: Bearer <accessToken>
```

## Demo Accounts

After running the seed script, these accounts are available:

- **Admin:** ADMIN001 / 12345678
- **Customer 1:** CUST001 / 11111111 (Normal, 85 points)
- **Customer 2:** CUST002 / 22222222 (Loyal, 140 points)
- **Customer 3:** CUST003 / 33333333 (Owner, 220 points)

## Point Calculation

Points are calculated based on purchase amount and customer role:

- **Normal:** 1.1x multiplier (e.g., 2500 Ft → 27 points)
- **Loyal:** 1.4x multiplier (e.g., 2500 Ft → 35 points)
- **Owner:** 1.7x multiplier (e.g., 2500 Ft → 42 points)

Formula: `Math.floor((amount / 100) * multiplier)`

## Role Upgrades

Customers are automatically upgraded based on visit count:

- **20 visits** → Loyal
- **50 visits** → Owner

## Database Management

### View Database

```bash
pnpm run prisma:studio
```

This opens Prisma Studio at `http://localhost:5555`

### Create Migration

```bash
pnpm run prisma:migrate
```

### Reset Database

```bash
npx prisma migrate reset
pnpm run seed
```

## Production Deployment

### Railway.app (Recommended)

1. Create a new project on Railway
2. Add PostgreSQL database
3. Add Node.js service
4. Set environment variables in Railway dashboard
5. Connect GitHub repository
6. Railway will auto-deploy on push

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="generate-secure-random-string"
JWT_REFRESH_SECRET="generate-another-secure-string"
PORT=3001
NODE_ENV=production
CORS_ORIGIN="https://your-frontend-domain.com"
```

## Security Notes

- PIN codes are hashed with bcrypt (10 rounds)
- JWT tokens expire after 15 minutes (access) and 7 days (refresh)
- All sensitive routes require authentication
- Admin-only routes have additional role checks
- Input validation on all endpoints
- SQL injection prevention via Prisma ORM

## Troubleshooting

### Database Connection Issues

Check your `DATABASE_URL` format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

### Port Already in Use

Change the `PORT` in `.env` file or kill the process:
```bash
lsof -ti:3001 | xargs kill -9
```

### Prisma Client Not Generated

Run:
```bash
pnpm run prisma:generate
```

## License

MIT