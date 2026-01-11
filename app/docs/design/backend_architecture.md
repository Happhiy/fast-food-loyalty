# Backend Architecture Design - Loyalty System Migration

## Executive Summary

This document outlines the migration strategy from a localStorage-based React application to a full-stack system with a proper backend and database. The goal is to enable cross-device synchronization and multi-user access for the fast-food loyalty system.

---

## 1. Implementation Approach

### 1.1 Migration Strategy

**Phase 1: Backend Setup**
- Set up FastAPI backend with SQLModel ORM
- Configure PostgreSQL database
- Implement authentication system with JWT
- Create REST API endpoints

**Phase 2: Frontend Integration**
- Replace localStorage calls with API calls
- Add loading states and error handling
- Implement token management
- Add offline fallback (optional)

**Phase 3: Deployment & Testing**
- Deploy backend to Railway/Render
- Deploy frontend to Vercel/Netlify
- Migrate seed data
- Cross-device testing

### 1.2 Technology Stack Selection

**Backend:**
- **FastAPI** (Python) - Modern, fast, automatic API documentation
- **SQLModel** - Type-safe ORM combining SQLAlchemy + Pydantic
- **PostgreSQL** - Robust relational database with excellent data integrity
- **JWT (python-jose)** - Secure token-based authentication
- **bcrypt** - Password hashing
- **CORS middleware** - Cross-origin request handling

**Rationale:**
- FastAPI provides automatic OpenAPI documentation
- SQLModel ensures type safety and reduces boilerplate
- PostgreSQL offers ACID compliance and strong foreign key support
- JWT enables stateless authentication across devices

**Frontend (No Changes):**
- React + TypeScript
- Shadcn-ui components
- Tailwind CSS

---

## 2. Database Schema Design

### 2.1 Entity Relationship Diagram

```plantuml
@startuml
!define table(x) class x << (T,#FFAAAA) >>
!define primary_key(x) <u>x</u>
!define foreign_key(x) <i>x</i>

table(customers) {
  primary_key(id): UUID
  --
  loyalty_id: VARCHAR(20) UNIQUE NOT NULL
  name: VARCHAR(100) NOT NULL
  email: VARCHAR(100) NOT NULL
  phone: VARCHAR(20)
  pin_code_hash: VARCHAR(255) NOT NULL
  points: INTEGER DEFAULT 0
  total_spent: DECIMAL(10,2) DEFAULT 0
  visit_count: INTEGER DEFAULT 0
  role: ENUM('normal','loyal','owner') DEFAULT 'normal'
  is_admin: BOOLEAN DEFAULT FALSE
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()
}

table(purchases) {
  primary_key(id): UUID
  --
  foreign_key(customer_id): UUID NOT NULL
  amount: DECIMAL(10,2) NOT NULL
  points_earned: INTEGER NOT NULL
  receipt_number: VARCHAR(50)
  created_at: TIMESTAMP DEFAULT NOW()
}

table(coupons) {
  primary_key(id): UUID
  --
  code: VARCHAR(20) UNIQUE NOT NULL
  foreign_key(customer_id): UUID NOT NULL
  value: INTEGER DEFAULT 1000
  is_redeemed: BOOLEAN DEFAULT FALSE
  created_at: TIMESTAMP DEFAULT NOW()
  redeemed_at: TIMESTAMP NULL
}

customers ||--o{ purchases : "has many"
customers ||--o{ coupons : "has many"

note right of customers
  - loyalty_id: Unique identifier for login
  - pin_code_hash: bcrypt hashed 8-digit PIN
  - role: Determines point multiplier
  - is_admin: Separates admin from customers
end note

note right of purchases
  - Points calculated: floor(amount/100) × role_multiplier
  - Multipliers: normal=1.1, loyal=1.4, owner=1.7
end note

note right of coupons
  - code: Auto-generated (COUP-YYYY-XXX)
  - value: Fixed at 1000 Ft
  - Customer creates, admin redeems
end note

@enduml
```

### 2.2 Database Constraints

**customers table:**
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    pin_code_hash VARCHAR(255) NOT NULL,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    total_spent DECIMAL(10,2) DEFAULT 0 CHECK (total_spent >= 0),
    visit_count INTEGER DEFAULT 0 CHECK (visit_count >= 0),
    role VARCHAR(10) DEFAULT 'normal' CHECK (role IN ('normal', 'loyal', 'owner')),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_loyalty_id ON customers(loyalty_id);
CREATE INDEX idx_customers_email ON customers(email);
```

**purchases table:**
```sql
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
    receipt_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_customer_id ON purchases(customer_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);
```

**coupons table:**
```sql
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    value INTEGER DEFAULT 1000 CHECK (value > 0),
    is_redeemed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redeemed_at TIMESTAMP NULL
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_customer_id ON coupons(customer_id);
CREATE INDEX idx_coupons_is_redeemed ON coupons(is_redeemed);
```

---

## 3. REST API Design

### 3.1 API Endpoints Specification

#### 3.1.1 Authentication Endpoints

**POST /api/auth/login**
```typescript
// Request
{
  "loyalty_id": "ADMIN001",
  "pin_code": "12345678"
}

// Response (Success)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "loyalty_id": "ADMIN001",
    "name": "Admin User",
    "email": "admin@fastfood.hu",
    "role": "normal",
    "is_admin": true,
    "points": 0
  }
}

// Response (Error)
{
  "detail": "Invalid loyalty ID or PIN code"
}
```

**POST /api/auth/refresh**
```typescript
// Request
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "access_token": "new_token_here",
  "token_type": "bearer"
}
```

**GET /api/auth/me**
```typescript
// Headers: Authorization: Bearer {token}

// Response
{
  "id": "uuid",
  "loyalty_id": "CUST001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+36301234567",
  "points": 150,
  "total_spent": 15000,
  "visit_count": 10,
  "role": "loyal",
  "is_admin": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 3.1.2 Customer Endpoints

**GET /api/customers** (Admin only)
```typescript
// Headers: Authorization: Bearer {admin_token}
// Query params: ?skip=0&limit=100&role=loyal

// Response
{
  "total": 45,
  "customers": [
    {
      "id": "uuid",
      "loyalty_id": "CUST001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+36301234567",
      "points": 150,
      "total_spent": 15000,
      "visit_count": 10,
      "role": "loyal",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**GET /api/customers/:id** (Admin or self)
```typescript
// Headers: Authorization: Bearer {token}

// Response
{
  "id": "uuid",
  "loyalty_id": "CUST001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+36301234567",
  "points": 150,
  "total_spent": 15000,
  "visit_count": 10,
  "role": "loyal",
  "is_admin": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**POST /api/customers** (Admin only)
```typescript
// Request
{
  "loyalty_id": "CUST100",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+36309876543",
  "role": "normal"
}

// Response
{
  "id": "uuid",
  "loyalty_id": "CUST100",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+36309876543",
  "pin_code": "87654321",  // Only returned on creation
  "points": 0,
  "total_spent": 0,
  "visit_count": 0,
  "role": "normal",
  "is_admin": false,
  "created_at": "2024-01-20T14:25:00Z"
}
```

**PUT /api/customers/:id** (Admin only)
```typescript
// Request
{
  "name": "Jane Smith Updated",
  "email": "jane.new@example.com",
  "phone": "+36309876543",
  "points": 200,
  "visit_count": 15,
  "role": "loyal"
}

// Response
{
  "id": "uuid",
  "loyalty_id": "CUST100",
  "name": "Jane Smith Updated",
  "email": "jane.new@example.com",
  "phone": "+36309876543",
  "points": 200,
  "total_spent": 15000,
  "visit_count": 15,
  "role": "loyal",
  "updated_at": "2024-01-20T15:30:00Z"
}
```

**DELETE /api/customers/:id** (Admin only)
```typescript
// Response
{
  "message": "Customer deleted successfully"
}
```

#### 3.1.3 Purchase Endpoints

**POST /api/purchases** (Admin only)
```typescript
// Request
{
  "customer_id": "uuid",
  "amount": 5000,
  "receipt_number": "REC-2024-001"
}

// Response
{
  "id": "uuid",
  "customer_id": "uuid",
  "amount": 5000,
  "points_earned": 55,  // floor(5000/100) * 1.1 for normal role
  "receipt_number": "REC-2024-001",
  "created_at": "2024-01-20T16:00:00Z",
  "customer": {
    "loyalty_id": "CUST001",
    "name": "John Doe",
    "new_points": 205,
    "new_visit_count": 11
  }
}
```

**GET /api/purchases/:customerId** (Admin or self)
```typescript
// Query params: ?skip=0&limit=50

// Response
{
  "total": 10,
  "purchases": [
    {
      "id": "uuid",
      "amount": 5000,
      "points_earned": 55,
      "receipt_number": "REC-2024-001",
      "created_at": "2024-01-20T16:00:00Z"
    }
  ]
}
```

#### 3.1.4 Coupon Endpoints

**GET /api/coupons/:customerId** (Admin or self)
```typescript
// Query params: ?is_redeemed=false

// Response
{
  "total": 3,
  "coupons": [
    {
      "id": "uuid",
      "code": "COUP-2024-001",
      "value": 1000,
      "is_redeemed": false,
      "created_at": "2024-01-15T10:00:00Z",
      "redeemed_at": null
    }
  ]
}
```

**POST /api/coupons/create** (Customer only, self-service)
```typescript
// Request
{
  "customer_id": "uuid"
}

// Response
{
  "id": "uuid",
  "code": "COUP-2024-045",
  "customer_id": "uuid",
  "value": 1000,
  "is_redeemed": false,
  "created_at": "2024-01-20T17:00:00Z",
  "customer": {
    "loyalty_id": "CUST001",
    "name": "John Doe",
    "remaining_points": 105  // 205 - 100
  }
}

// Error Response
{
  "detail": "Insufficient points. You need 100 points to create a coupon."
}
```

**POST /api/coupons/lookup** (Admin only)
```typescript
// Request
{
  "code": "COUP-2024-001"
}

// Response (Valid coupon)
{
  "id": "uuid",
  "code": "COUP-2024-001",
  "value": 1000,
  "is_redeemed": false,
  "created_at": "2024-01-15T10:00:00Z",
  "customer": {
    "id": "uuid",
    "loyalty_id": "CUST001",
    "name": "John Doe",
    "phone": "+36301234567"
  }
}

// Response (Already redeemed)
{
  "detail": "This coupon has already been redeemed on 2024-01-18T12:30:00Z"
}

// Response (Not found)
{
  "detail": "Coupon not found"
}
```

**PUT /api/coupons/:code/redeem** (Admin only)
```typescript
// Response
{
  "id": "uuid",
  "code": "COUP-2024-001",
  "value": 1000,
  "is_redeemed": true,
  "created_at": "2024-01-15T10:00:00Z",
  "redeemed_at": "2024-01-20T18:00:00Z",
  "customer": {
    "loyalty_id": "CUST001",
    "name": "John Doe"
  }
}
```

### 3.2 Error Handling

**Standard Error Response Format:**
```typescript
{
  "detail": "Error message in English or Hungarian",
  "error_code": "INVALID_CREDENTIALS",
  "timestamp": "2024-01-20T12:00:00Z"
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate loyalty_id, etc.)
- 422: Unprocessable Entity (validation error)
- 500: Internal Server Error

---

## 4. Authentication & Security

### 4.1 JWT Token Strategy

**Token Structure:**
```json
{
  "sub": "customer_uuid",
  "loyalty_id": "CUST001",
  "is_admin": false,
  "role": "loyal",
  "exp": 1705766400,
  "iat": 1705680000
}
```

**Token Configuration:**
- Access Token Expiry: 24 hours
- Refresh Token Expiry: 30 days (optional)
- Algorithm: HS256
- Secret Key: Environment variable (min 32 characters)

**Token Flow:**
1. User logs in with loyalty_id + pin_code
2. Backend validates credentials (bcrypt compare)
3. Backend generates JWT token
4. Frontend stores token in localStorage/sessionStorage
5. Frontend includes token in Authorization header for all requests
6. Backend validates token on each request using middleware

### 4.2 Password Security

**PIN Code Hashing:**
```python
import bcrypt

# On customer creation
pin_code = generate_8_digit_pin()  # e.g., "12345678"
pin_hash = bcrypt.hashpw(pin_code.encode(), bcrypt.gensalt())
# Store pin_hash in database

# On login
is_valid = bcrypt.checkpw(input_pin.encode(), stored_hash)
```

**PIN Code Generation:**
```python
import secrets

def generate_8_digit_pin() -> str:
    """Generate cryptographically secure 8-digit PIN"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(8)])
```

### 4.3 Role-Based Access Control (RBAC)

**Permission Matrix:**

| Endpoint | Customer | Admin |
|----------|----------|-------|
| POST /api/auth/login | ✓ | ✓ |
| GET /api/auth/me | ✓ (self) | ✓ |
| GET /api/customers | ✗ | ✓ |
| GET /api/customers/:id | ✓ (self) | ✓ |
| POST /api/customers | ✗ | ✓ |
| PUT /api/customers/:id | ✗ | ✓ |
| DELETE /api/customers/:id | ✗ | ✓ |
| POST /api/purchases | ✗ | ✓ |
| GET /api/purchases/:customerId | ✓ (self) | ✓ |
| GET /api/coupons/:customerId | ✓ (self) | ✓ |
| POST /api/coupons/create | ✓ (self) | ✗ |
| POST /api/coupons/lookup | ✗ | ✓ |
| PUT /api/coupons/:code/redeem | ✗ | ✓ |

**Middleware Implementation:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_jwt(token)
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

async def require_admin(current_user = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

### 4.4 Security Best Practices

1. **CORS Configuration:**
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://yourdomain.com"],  # Production domain
       allow_credentials=True,
       allow_methods=["GET", "POST", "PUT", "DELETE"],
       allow_headers=["*"],
   )
   ```

2. **Rate Limiting:**
   - Login endpoint: 5 attempts per minute per IP
   - API endpoints: 100 requests per minute per user

3. **Input Validation:**
   - Use Pydantic models for all request bodies
   - Validate loyalty_id format (alphanumeric, max 20 chars)
   - Validate PIN code (exactly 8 digits)
   - Sanitize all string inputs

4. **SQL Injection Prevention:**
   - Use SQLModel ORM (parameterized queries)
   - Never concatenate user input into SQL

5. **Environment Variables:**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   JWT_SECRET_KEY=your-secret-key-min-32-chars
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ENVIRONMENT=production
   ```

---

## 5. System Architecture

### 5.1 Architecture Diagram

```plantuml
@startuml
!define RECTANGLE class

package "Frontend (React + TypeScript)" {
    [Login Page] as Login
    [Customer Home] as CustomerHome
    [Customer Coupons] as CustomerCoupons
    [Admin Panel] as AdminPanel
    [API Client] as ApiClient
}

package "Backend (FastAPI + SQLModel)" {
    [Auth Router] as AuthRouter
    [Customer Router] as CustomerRouter
    [Purchase Router] as PurchaseRouter
    [Coupon Router] as CouponRouter
    [JWT Middleware] as JWTMiddleware
    [RBAC Middleware] as RBACMiddleware
}

package "Database (PostgreSQL)" {
    database "customers" as CustomersDB
    database "purchases" as PurchasesDB
    database "coupons" as CouponsDB
}

package "External Services" {
    [Email Service] as EmailService
    [Logging Service] as LoggingService
}

Login --> ApiClient : API calls
CustomerHome --> ApiClient : API calls
CustomerCoupons --> ApiClient : API calls
AdminPanel --> ApiClient : API calls

ApiClient --> AuthRouter : HTTPS
ApiClient --> CustomerRouter : HTTPS
ApiClient --> PurchaseRouter : HTTPS
ApiClient --> CouponRouter : HTTPS

AuthRouter --> JWTMiddleware : validate token
CustomerRouter --> JWTMiddleware : validate token
CustomerRouter --> RBACMiddleware : check permissions
PurchaseRouter --> RBACMiddleware : check permissions
CouponRouter --> RBACMiddleware : check permissions

AuthRouter --> CustomersDB : query
CustomerRouter --> CustomersDB : CRUD
PurchaseRouter --> PurchasesDB : CRUD
PurchaseRouter --> CustomersDB : update points
CouponRouter --> CouponsDB : CRUD
CouponRouter --> CustomersDB : update points

AuthRouter --> LoggingService : log events
CustomerRouter --> EmailService : send notifications (optional)

note right of ApiClient
  - Axios HTTP client
  - Token management
  - Error handling
  - Retry logic
end note

note right of JWTMiddleware
  - Decode JWT token
  - Validate expiry
  - Extract user info
end note

note right of CustomersDB
  - User authentication
  - Points tracking
  - Role management
end note

@enduml
```

### 5.2 Sequence Diagrams

#### 5.2.1 Customer Login Flow

```plantuml
@startuml
actor Customer
participant "Login Page" as UI
participant "API Client" as API
participant "Auth Router" as Auth
participant "Database" as DB

Customer -> UI: Enter loyalty_id + PIN
UI -> API: POST /api/auth/login
    note right
        Input: {
            "loyalty_id": "CUST001",
            "pin_code": "11111111"
        }
    end note

API -> Auth: Forward request
Auth -> DB: SELECT * FROM customers\nWHERE loyalty_id = 'CUST001'
DB --> Auth: Return customer record
Auth -> Auth: bcrypt.checkpw(pin, hash)
    note right
        Verify PIN code
        against stored hash
    end note

alt PIN valid
    Auth -> Auth: Generate JWT token
    Auth --> API: Return token + user data
        note right
            Output: {
                "access_token": "eyJ...",
                "token_type": "bearer",
                "user": {...}
            }
        end note
    API --> UI: Store token, redirect
    UI --> Customer: Show Customer Home
else PIN invalid
    Auth --> API: 401 Unauthorized
    API --> UI: Show error message
    UI --> Customer: "Hibás hűségkártya szám vagy PIN kód"
end

@enduml
```

#### 5.2.2 Purchase Recording Flow

```plantuml
@startuml
actor Admin
participant "Admin Panel" as UI
participant "API Client" as API
participant "Purchase Router" as Purchase
participant "Database" as DB

Admin -> UI: Enter purchase details
UI -> API: POST /api/purchases
    note right
        Headers: {
            "Authorization": "Bearer {admin_token}"
        }
        Body: {
            "customer_id": "uuid",
            "amount": 5000,
            "receipt_number": "REC-001"
        }
    end note

API -> Purchase: Forward request
Purchase -> Purchase: Verify admin token
Purchase -> DB: BEGIN TRANSACTION

Purchase -> DB: SELECT * FROM customers\nWHERE id = 'uuid'
DB --> Purchase: Return customer (role: loyal)

Purchase -> Purchase: Calculate points\nbase = floor(5000/100) = 50\npoints = floor(50 * 1.4) = 70
    note right
        Point calculation:
        1. Base = floor(amount / 100)
        2. Multiply by role multiplier
           - normal: 1.1
           - loyal: 1.4
           - owner: 1.7
        3. Round down
    end note

Purchase -> DB: INSERT INTO purchases\n(customer_id, amount, points_earned)
Purchase -> DB: UPDATE customers SET\npoints = points + 70,\ntotal_spent = total_spent + 5000,\nvisit_count = visit_count + 1\nWHERE id = 'uuid'

DB --> Purchase: Confirm updates
Purchase -> DB: COMMIT TRANSACTION

Purchase --> API: Return purchase + updated customer
    note right
        Output: {
            "id": "uuid",
            "amount": 5000,
            "points_earned": 70,
            "customer": {
                "new_points": 220,
                "new_visit_count": 11
            }
        }
    end note

API --> UI: Update UI
UI --> Admin: Show success message

@enduml
```

#### 5.2.3 Customer Coupon Redemption Flow

```plantuml
@startuml
actor Customer
participant "Customer Home" as UI
participant "API Client" as API
participant "Coupon Router" as Coupon
participant "Database" as DB

Customer -> UI: Click "Kupon beváltása"
UI -> UI: Check points >= 100

UI -> API: POST /api/coupons/create
    note right
        Headers: {
            "Authorization": "Bearer {customer_token}"
        }
        Body: {
            "customer_id": "uuid"
        }
    end note

API -> Coupon: Forward request
Coupon -> Coupon: Verify customer token
Coupon -> DB: BEGIN TRANSACTION

Coupon -> DB: SELECT points FROM customers\nWHERE id = 'uuid' FOR UPDATE
DB --> Coupon: Return points (150)

alt points >= 100
    Coupon -> Coupon: Generate unique code\n"COUP-2024-045"
    Coupon -> DB: INSERT INTO coupons\n(code, customer_id, value)
    Coupon -> DB: UPDATE customers SET\npoints = points - 100\nWHERE id = 'uuid'
    DB --> Coupon: Confirm updates
    Coupon -> DB: COMMIT TRANSACTION
    
    Coupon --> API: Return coupon data
        note right
            Output: {
                "id": "uuid",
                "code": "COUP-2024-045",
                "value": 1000,
                "is_redeemed": false,
                "customer": {
                    "remaining_points": 50
                }
            }
        end note
    API --> UI: Show coupon
    UI --> Customer: Display coupon code\n"COUP-2024-045"
else points < 100
    Coupon -> DB: ROLLBACK TRANSACTION
    Coupon --> API: 400 Bad Request
    API --> UI: Show error
    UI --> Customer: "Nincs elég pontod"
end

@enduml
```

#### 5.2.4 Admin Coupon Verification Flow

```plantuml
@startuml
actor Admin
actor Customer
participant "Admin Panel" as UI
participant "API Client" as API
participant "Coupon Router" as Coupon
participant "Database" as DB

Customer -> Admin: Show coupon code\n"COUP-2024-045"
Admin -> UI: Enter code in search
UI -> API: POST /api/coupons/lookup
    note right
        Headers: {
            "Authorization": "Bearer {admin_token}"
        }
        Body: {
            "code": "COUP-2024-045"
        }
    end note

API -> Coupon: Forward request
Coupon -> Coupon: Verify admin token
Coupon -> DB: SELECT * FROM coupons\nJOIN customers\nWHERE code = 'COUP-2024-045'

alt Coupon found and not redeemed
    DB --> Coupon: Return coupon + customer data
    Coupon --> API: Return details
        note right
            Output: {
                "code": "COUP-2024-045",
                "value": 1000,
                "is_redeemed": false,
                "created_at": "2024-01-20T17:00:00Z",
                "customer": {
                    "loyalty_id": "CUST001",
                    "name": "John Doe",
                    "phone": "+36301234567"
                }
            }
        end note
    API --> UI: Display coupon details
    UI --> Admin: Show "Elfogad" / "Elutasít"
    
    Admin -> UI: Click "Elfogad"
    UI -> API: PUT /api/coupons/COUP-2024-045/redeem
    API -> Coupon: Forward request
    Coupon -> DB: UPDATE coupons SET\nis_redeemed = TRUE,\nredeemed_at = NOW()\nWHERE code = 'COUP-2024-045'
    DB --> Coupon: Confirm update
    Coupon --> API: Return updated coupon
    API --> UI: Show success
    UI --> Admin: "Kupon sikeresen beváltva"
    
else Coupon already redeemed
    DB --> Coupon: Return redeemed coupon
    Coupon --> API: 400 Bad Request
    API --> UI: Show error
    UI --> Admin: "Ez a kupon már be lett váltva"
    
else Coupon not found
    DB --> Coupon: No results
    Coupon --> API: 404 Not Found
    API --> UI: Show error
    UI --> Admin: "Kupon nem található"
end

@enduml
```

### 5.3 Data Flow Architecture

**Request Flow:**
1. Frontend sends HTTPS request with JWT token
2. Backend validates token via middleware
3. Backend checks user permissions (RBAC)
4. Backend processes business logic
5. Backend queries/updates PostgreSQL database
6. Backend returns JSON response
7. Frontend updates UI state

**Data Synchronization:**
- Real-time: All devices fetch latest data on page load
- Auto-refresh: Customer pages refresh every 5 minutes
- Optimistic updates: UI updates immediately, rolls back on error
- Conflict resolution: Last-write-wins (timestamp-based)

---

## 6. Deployment Architecture

### 6.1 Hosting Recommendations

**Backend Hosting Options:**

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Railway** | Easy setup, PostgreSQL included, auto-deploy from Git | Limited free tier | $5-20/month |
| **Render** | Free PostgreSQL, auto-deploy, good docs | Slower cold starts on free tier | $7-25/month |
| **Heroku** | Mature platform, many addons | More expensive, complex pricing | $7-25/month |
| **DigitalOcean App Platform** | Predictable pricing, good performance | Requires more setup | $5-12/month |

**Recommendation: Railway**
- Best developer experience
- Integrated PostgreSQL database
- Automatic HTTPS
- Simple environment variable management
- Git-based deployment

**Frontend Hosting Options:**

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Vercel** | Optimized for React, auto-deploy, CDN | Vendor lock-in | Free tier sufficient |
| **Netlify** | Easy setup, good CI/CD | Less React-optimized than Vercel | Free tier sufficient |
| **Cloudflare Pages** | Fast CDN, unlimited bandwidth | Newer platform | Free |

**Recommendation: Vercel**
- Best React performance
- Automatic preview deployments
- Built-in analytics

### 6.2 Environment Configuration

**Backend (.env):**
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/loyalty_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS_DEV=http://localhost:5173,http://localhost:3000

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Optional Services
SENTRY_DSN=https://...  # Error tracking
SENDGRID_API_KEY=...    # Email notifications
```

**Frontend (.env):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

### 6.3 Deployment Steps

**Initial Setup:**

1. **Create Railway Project:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Add PostgreSQL Database:**
   ```bash
   railway add postgresql
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   railway up
   ```

4. **Run Database Migrations:**
   ```bash
   railway run alembic upgrade head
   ```

5. **Deploy Frontend to Vercel:**
   ```bash
   cd frontend
   npm install -g vercel
   vercel --prod
   ```

**Continuous Deployment:**
- Backend: Connect Railway to GitHub repo, auto-deploy on push to `main`
- Frontend: Connect Vercel to GitHub repo, auto-deploy on push to `main`

### 6.4 Database Migration Strategy

**Migration from localStorage to PostgreSQL:**

1. **Export Current Data:**
   ```javascript
   // Run in browser console on current app
   const data = {
     customers: JSON.parse(localStorage.getItem('loyalty_customers') || '[]'),
     purchases: JSON.parse(localStorage.getItem('loyalty_purchases') || '[]'),
     coupons: JSON.parse(localStorage.getItem('loyalty_coupons') || '[]')
   };
   console.log(JSON.stringify(data, null, 2));
   // Copy output to data.json file
   ```

2. **Create Migration Script:**
   ```python
   # backend/scripts/migrate_data.py
   import json
   import bcrypt
   from sqlmodel import Session, select
   from app.database import engine
   from app.models import Customer, Purchase, Coupon
   
   def migrate_data(json_file: str):
       with open(json_file) as f:
           data = json.load(f)
       
       with Session(engine) as session:
           # Migrate customers
           customer_map = {}
           for old_customer in data['customers']:
               # Hash the PIN code
               pin_hash = bcrypt.hashpw(
                   old_customer['pin_code'].encode(),
                   bcrypt.gensalt()
               )
               
               new_customer = Customer(
                   loyalty_id=old_customer['loyalty_id'],
                   name=old_customer['name'],
                   email=old_customer['email'],
                   phone=old_customer.get('phone'),
                   pin_code_hash=pin_hash.decode(),
                   points=old_customer['points'],
                   total_spent=old_customer.get('total_spent', 0),
                   visit_count=old_customer.get('visits', 0),
                   role=old_customer['role'],
                   is_admin=old_customer.get('is_admin', False)
               )
               session.add(new_customer)
               session.flush()
               customer_map[old_customer['loyalty_id']] = new_customer.id
           
           # Migrate purchases
           for old_purchase in data['purchases']:
               new_purchase = Purchase(
                   customer_id=customer_map[old_purchase['customer_loyalty_id']],
                   amount=old_purchase['amount'],
                   points_earned=old_purchase['points_earned'],
                   receipt_number=old_purchase.get('receipt_number'),
                   created_at=old_purchase['date']
               )
               session.add(new_purchase)
           
           # Migrate coupons
           for old_coupon in data['coupons']:
               new_coupon = Coupon(
                   code=old_coupon['code'],
                   customer_id=customer_map[old_coupon['customer_loyalty_id']],
                   value=old_coupon['value'],
                   is_redeemed=old_coupon['redeemed'],
                   created_at=old_coupon['created'],
                   redeemed_at=old_coupon.get('redeemed_at')
               )
               session.add(new_coupon)
           
           session.commit()
           print(f"Migrated {len(data['customers'])} customers")
           print(f"Migrated {len(data['purchases'])} purchases")
           print(f"Migrated {len(data['coupons'])} coupons")
   
   if __name__ == "__main__":
       migrate_data("data.json")
   ```

3. **Run Migration:**
   ```bash
   railway run python scripts/migrate_data.py
   ```

### 6.5 Monitoring & Logging

**Application Monitoring:**
- Use Sentry for error tracking
- Use Railway's built-in logs
- Set up health check endpoint: `GET /api/health`

**Database Monitoring:**
- Railway provides PostgreSQL metrics dashboard
- Monitor connection pool usage
- Set up alerts for slow queries

**Performance Metrics:**
- API response times
- Database query performance
- Frontend load times (Vercel Analytics)

---

## 7. Frontend Integration Changes

### 7.1 API Client Implementation

**Create API client (`frontend/src/lib/api.ts`):**
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, logout user
          localStorage.removeItem('access_token');
          localStorage.removeItem('current_user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(loyalty_id: string, pin_code: string) {
    const response = await this.client.post('/api/auth/login', {
      loyalty_id,
      pin_code,
    });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Customers
  async getCustomers(skip = 0, limit = 100) {
    const response = await this.client.get('/api/customers', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getCustomer(id: string) {
    const response = await this.client.get(`/api/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: CreateCustomerRequest) {
    const response = await this.client.post('/api/customers', data);
    return response.data;
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest) {
    const response = await this.client.put(`/api/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: string) {
    const response = await this.client.delete(`/api/customers/${id}`);
    return response.data;
  }

  // Purchases
  async createPurchase(data: CreatePurchaseRequest) {
    const response = await this.client.post('/api/purchases', data);
    return response.data;
  }

  async getPurchases(customerId: string, skip = 0, limit = 50) {
    const response = await this.client.get(`/api/purchases/${customerId}`, {
      params: { skip, limit },
    });
    return response.data;
  }

  // Coupons
  async getCoupons(customerId: string, isRedeemed?: boolean) {
    const response = await this.client.get(`/api/coupons/${customerId}`, {
      params: isRedeemed !== undefined ? { is_redeemed: isRedeemed } : {},
    });
    return response.data;
  }

  async createCoupon(customerId: string) {
    const response = await this.client.post('/api/coupons/create', {
      customer_id: customerId,
    });
    return response.data;
  }

  async lookupCoupon(code: string) {
    const response = await this.client.post('/api/coupons/lookup', { code });
    return response.data;
  }

  async redeemCoupon(code: string) {
    const response = await this.client.put(`/api/coupons/${code}/redeem`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### 7.2 Migration Checklist

**Files to Update:**

1. **Login.tsx**
   - Replace `storage.authenticate()` with `apiClient.login()`
   - Store JWT token in localStorage
   - Handle API errors

2. **CustomerHome.tsx**
   - Replace `storage.getCustomerByLoyaltyId()` with `apiClient.getCurrentUser()`
   - Replace `storage.getPurchasesByCustomer()` with `apiClient.getPurchases()`
   - Replace `storage.customerCreateCoupon()` with `apiClient.createCoupon()`
   - Add loading states

3. **CustomerCoupons.tsx**
   - Replace `storage.getCouponsByCustomer()` with `apiClient.getCoupons()`
   - Add loading states

4. **Admin.tsx**
   - Replace `storage.getAllCustomers()` with `apiClient.getCustomers()`
   - Replace `storage.createCustomer()` with `apiClient.createCustomer()`
   - Replace `storage.updateCustomer()` with `apiClient.updateCustomer()`
   - Replace `storage.deleteCustomer()` with `apiClient.deleteCustomer()`
   - Replace `storage.recordPurchase()` with `apiClient.createPurchase()`
   - Replace `storage.lookupCouponByCode()` with `apiClient.lookupCoupon()`
   - Replace `storage.redeemCoupon()` with `apiClient.redeemCoupon()`
   - Add loading states and error handling

5. **Remove storage.ts**
   - Delete `/workspace/app/frontend/src/lib/storage.ts`

---

## 8. Testing Strategy

### 8.1 Backend Testing

**Unit Tests:**
```python
# tests/test_auth.py
def test_login_success():
    response = client.post("/api/auth/login", json={
        "loyalty_id": "ADMIN001",
        "pin_code": "12345678"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials():
    response = client.post("/api/auth/login", json={
        "loyalty_id": "ADMIN001",
        "pin_code": "wrongpin"
    })
    assert response.status_code == 401
```

**Integration Tests:**
```python
# tests/test_purchases.py
def test_purchase_flow():
    # Create customer
    customer = create_test_customer()
    
    # Record purchase
    response = client.post("/api/purchases", json={
        "customer_id": customer.id,
        "amount": 5000
    }, headers=admin_headers)
    
    assert response.status_code == 201
    assert response.json()["points_earned"] == 55
    
    # Verify customer points updated
    customer_response = client.get(f"/api/customers/{customer.id}")
    assert customer_response.json()["points"] == 55
```

### 8.2 Frontend Testing

**Component Tests:**
```typescript
// tests/Login.test.tsx
describe('Login', () => {
  it('should login successfully with valid credentials', async () => {
    render(<Login />);
    
    fireEvent.change(screen.getByLabelText('Hűségkártya szám'), {
      target: { value: 'ADMIN001' }
    });
    fireEvent.change(screen.getByLabelText('8 számjegyű PIN kód'), {
      target: { value: '12345678' }
    });
    
    fireEvent.click(screen.getByText('Bejelentkezés'));
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/home');
    });
  });
});
```

### 8.3 End-to-End Testing

**Playwright Tests:**
```typescript
// e2e/loyalty-flow.spec.ts
test('customer can redeem coupon', async ({ page }) => {
  // Login as customer
  await page.goto('/login');
  await page.fill('[name="loyalty_id"]', 'CUST001');
  await page.fill('[name="pin_code"]', '11111111');
  await page.click('button[type="submit"]');
  
  // Navigate to home
  await expect(page).toHaveURL('/home');
  
  // Check points >= 100
  const points = await page.textContent('[data-testid="points"]');
  expect(parseInt(points)).toBeGreaterThanOrEqual(100);
  
  // Redeem coupon
  await page.click('text=Kupon beváltása');
  
  // Verify coupon created
  await expect(page).toHaveURL('/coupons');
  await expect(page.locator('[data-testid="coupon-code"]')).toBeVisible();
});
```

---

## 9. Unclear Aspects & Assumptions

### 9.1 Clarifications Needed

1. **Email Notifications:**
   - Should customers receive email when they earn enough points for a coupon?
   - Should admin receive email when a new customer is created?
   - **Assumption:** No email notifications in MVP, can be added later

2. **Coupon Expiration:**
   - Do coupons expire after a certain time period (e.g., 30 days)?
   - **Assumption:** Coupons do not expire in MVP

3. **Multiple Admin Accounts:**
   - Can there be multiple admin accounts?
   - How are admin accounts created (manual database insert or registration page)?
   - **Assumption:** Multiple admins supported, created via database seeding or SQL insert

4. **Customer Self-Registration:**
   - Will there ever be a customer self-registration feature?
   - **Assumption:** No, only admin can create customers (as per requirements)

5. **Purchase Receipt Upload:**
   - Should admins be able to upload receipt images?
   - **Assumption:** No, only receipt number is stored as text

6. **Loyalty ID Format:**
   - Is there a specific format for loyalty_id (e.g., CUST001, CUST002)?
   - Should it auto-increment or be manually entered?
   - **Assumption:** Admin manually enters loyalty_id, system validates uniqueness

7. **PIN Code Reset:**
   - How should customers reset their PIN if forgotten?
   - **Assumption:** Admin can reset PIN by editing customer in admin panel

8. **Data Retention:**
   - How long should purchase history and redeemed coupons be kept?
   - **Assumption:** Keep all data indefinitely

9. **Concurrent Coupon Redemption:**
   - What happens if two admins try to redeem the same coupon simultaneously?
   - **Assumption:** Database transaction with row-level locking prevents double redemption

10. **Mobile App:**
    - Is a native mobile app planned for the future?
    - **Assumption:** No, responsive web app is sufficient

### 9.2 Technical Assumptions

1. **Database Size:**
   - Estimated 1000 customers, 10,000 purchases per year
   - PostgreSQL free tier (Railway: 512MB) is sufficient for MVP

2. **Traffic:**
   - Estimated 100 requests per day
   - No need for load balancing or caching in MVP

3. **Backup Strategy:**
   - Railway provides automatic daily backups
   - Manual export script for additional safety

4. **Internationalization:**
   - Only Hungarian and English supported
   - No plans for additional languages

5. **Payment Integration:**
   - No payment processing needed (coupons are free rewards)

---

## 10. Next Steps

### 10.1 Implementation Phases

**Phase 1: Backend Setup (Week 1)**
- [ ] Set up FastAPI project structure
- [ ] Configure PostgreSQL database
- [ ] Implement database models with SQLModel
- [ ] Create authentication system (JWT)
- [ ] Implement all API endpoints
- [ ] Write unit tests
- [ ] Deploy to Railway

**Phase 2: Frontend Integration (Week 2)**
- [ ] Create API client
- [ ] Update Login.tsx
- [ ] Update CustomerHome.tsx
- [ ] Update CustomerCoupons.tsx
- [ ] Update Admin.tsx
- [ ] Remove storage.ts
- [ ] Add loading states and error handling
- [ ] Test on multiple devices

**Phase 3: Data Migration (Week 2)**
- [ ] Export current localStorage data
- [ ] Create migration script
- [ ] Run migration on production database
- [ ] Verify data integrity

**Phase 4: Testing & Deployment (Week 3)**
- [ ] End-to-end testing
- [ ] Cross-device testing (desktop, mobile, iPad)
- [ ] Performance testing
- [ ] Deploy frontend to Vercel
- [ ] User acceptance testing
- [ ] Go live

### 10.2 Post-Launch Enhancements

**Priority 1 (Next Month):**
- Add email notifications for coupon eligibility
- Implement coupon expiration (30 days)
- Add admin dashboard with statistics
- Add data export/backup functionality

**Priority 2 (Next Quarter):**
- Add customer profile photos
- Implement QR code login
- Add offline mode with service workers
- Add customer loyalty tiers with badges

**Priority 3 (Future):**
- Native mobile app (React Native)
- Advanced analytics dashboard
- SMS notifications
- Integration with POS system

---

## 11. Conclusion

This architecture design provides a robust foundation for migrating the loyalty system from localStorage to a proper backend with database synchronization. The system will support:

✅ Cross-device access (desktop, mobile, iPad)  
✅ Real-time data synchronization  
✅ Secure authentication with JWT  
✅ Role-based access control  
✅ Data integrity with PostgreSQL constraints  
✅ Scalability for future growth  

The FastAPI + SQLModel + PostgreSQL stack offers excellent developer experience, type safety, and performance. The deployment on Railway and Vercel provides easy setup with minimal operational overhead.

**Estimated Timeline:** 3 weeks from start to production deployment  
**Estimated Cost:** $12-30/month (Railway backend + Vercel frontend)

---

## Appendix A: File Structure

```
loyalty-system/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app initialization
│   │   ├── config.py               # Environment configuration
│   │   ├── database.py             # Database connection
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── customer.py         # Customer model
│   │   │   ├── purchase.py         # Purchase model
│   │   │   └── coupon.py           # Coupon model
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── customers.py        # Customer CRUD endpoints
│   │   │   ├── purchases.py        # Purchase endpoints
│   │   │   └── coupons.py          # Coupon endpoints
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Auth request/response schemas
│   │   │   ├── customer.py         # Customer schemas
│   │   │   ├── purchase.py         # Purchase schemas
│   │   │   └── coupon.py           # Coupon schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Auth business logic
│   │   │   ├── customer.py         # Customer business logic
│   │   │   ├── purchase.py         # Purchase business logic
│   │   │   └── coupon.py           # Coupon business logic
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py         # JWT, password hashing
│   │       └── dependencies.py     # FastAPI dependencies
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_customers.py
│   │   ├── test_purchases.py
│   │   └── test_coupons.py
│   ├── scripts/
│   │   └── migrate_data.py         # Data migration script
│   ├── alembic/                    # Database migrations
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
└── frontend/
    ├── src/
    │   ├── lib/
    │   │   └── api.ts              # API client (replaces storage.ts)
    │   ├── pages/
    │   │   ├── Login.tsx           # Updated with API calls
    │   │   ├── CustomerHome.tsx    # Updated with API calls
    │   │   ├── CustomerCoupons.tsx # Updated with API calls
    │   │   └── Admin.tsx           # Updated with API calls
    │   └── types/
    │       └── index.ts            # TypeScript interfaces
    ├── .env.example
    └── README.md
```

## Appendix B: Sample SQL Queries

**Get customer with purchases and coupons:**
```sql
SELECT 
    c.*,
    COUNT(DISTINCT p.id) as total_purchases,
    COUNT(DISTINCT co.id) FILTER (WHERE co.is_redeemed = false) as available_coupons,
    COUNT(DISTINCT co.id) FILTER (WHERE co.is_redeemed = true) as redeemed_coupons
FROM customers c
LEFT JOIN purchases p ON p.customer_id = c.id
LEFT JOIN coupons co ON co.customer_id = c.id
WHERE c.loyalty_id = 'CUST001'
GROUP BY c.id;
```

**Get top customers by points:**
```sql
SELECT 
    loyalty_id,
    name,
    points,
    total_spent,
    visit_count,
    role
FROM customers
WHERE is_admin = false
ORDER BY points DESC
LIMIT 10;
```

**Get purchase statistics:**
```sql
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as purchase_count,
    SUM(amount) as total_amount,
    SUM(points_earned) as total_points
FROM purchases
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-20  
**Author:** Bob (System Architect)