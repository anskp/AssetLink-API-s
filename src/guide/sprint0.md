# Sprint 0 - Project Initialization & Architecture

**Status**: ✅ Complete  
**Duration**: Foundation Sprint  
**Goal**: Establish production-grade backend infrastructure for AssetLink Custody

---

## 📋 Overview

Sprint 0 creates the foundational architecture for AssetLink Custody, a secure custody infrastructure for tokenized real-world assets (RWAs). This sprint focuses on setting up the database, configuration, utilities, error handling, and Express application.

---

## 🎯 Objectives

1. ✅ Initialize Express backend with security middleware
2. ✅ Set up Prisma ORM with MySQL database
3. ✅ Define core data models and state machines
4. ✅ Implement error handling and logging
5. ✅ Create utilities for math, time, and idempotency
6. ✅ Establish documentation standards

---

## 🗄️ Database Schema

### Tables Created

#### 1. **ApiKey** - API Authentication
```prisma
model ApiKey {
  id            String   @id @default(uuid())
  publicKey     String   @unique
  secretKeyHash String
  tenantId      String?
  permissions   Json
  ipWhitelist   Json?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Purpose**: Store HMAC authentication credentials for server-to-server API access.

---

#### 2. **VaultWallet** - Fireblocks Vault Metadata
```prisma
model VaultWallet {
  id              String   @id @default(uuid())
  fireblocksId    String   @unique
  blockchain      String
  vaultType       String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Purpose**: Track Fireblocks vault accounts used for custody.

---

#### 3. **CustodyRecord** - Asset-to-Token Mapping
```prisma
model CustodyRecord {
  id                String   @id @default(uuid())
  assetId           String   @unique
  status            String   // UNLINKED, LINKED, MINTED, WITHDRAWN, BURNED
  blockchain        String?
  tokenStandard     String?
  tokenAddress      String?
  tokenId           String?
  quantity          String?
  vaultWalletId     String?
  linkedAt          DateTime?
  mintedAt          DateTime?
  withdrawnAt       DateTime?
  burnedAt          DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Purpose**: Immutable mapping between physical assets and blockchain tokens.

**State Flow**:
```
UNLINKED → LINKED → MINTED → WITHDRAWN/BURNED
```

---

#### 4. **CustodyOperation** - Maker-Checker Workflow
```prisma
model CustodyOperation {
  id                  String   @id @default(uuid())
  operationType       String   // MINT, TRANSFER, BURN
  status              String   // PENDING_MAKER, PENDING_CHECKER, APPROVED, EXECUTED, REJECTED, FAILED
  custodyRecordId     String
  vaultWalletId       String?
  payload             Json
  initiatedBy         String
  approvedBy          String?
  rejectedBy          String?
  rejectionReason     String?
  fireblocksTaskId    String?
  txHash              String?
  executedAt          DateTime?
  failureReason       String?
  idempotencyKey      String?  @unique
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

**Purpose**: Track all custody operations with dual approval workflow.

**State Flow**:
```
PENDING_MAKER → PENDING_CHECKER → APPROVED → EXECUTED
                                           ↘ FAILED
                      ↘ REJECTED
```

---

#### 5. **AuditLog** - Append-Only Audit Trail
```prisma
model AuditLog {
  id                  String   @id @default(uuid())
  custodyRecordId     String?
  operationId         String?
  eventType           String
  actor               String
  metadata            Json
  ipAddress           String?
  userAgent           String?
  timestamp           DateTime @default(now())
}
```

**Purpose**: Immutable audit trail for compliance and forensics.

---

## 📊 State Machines

### Custody Status Enum

```javascript
export const CustodyStatus = {
  UNLINKED: 'UNLINKED',     // Asset not yet registered
  LINKED: 'LINKED',         // Asset registered, awaiting mint
  MINTED: 'MINTED',         // Token minted in custody vault
  WITHDRAWN: 'WITHDRAWN',   // Token transferred to external wallet
  BURNED: 'BURNED'          // Token burned (physical redemption)
};
```

**Valid Transitions**:
- `UNLINKED` → `LINKED`
- `LINKED` → `MINTED`
- `MINTED` → `WITHDRAWN` or `BURNED`

---

### Operation Status Enum

```javascript
export const OperationStatus = {
  PENDING_MAKER: 'PENDING_MAKER',
  PENDING_CHECKER: 'PENDING_CHECKER',
  APPROVED: 'APPROVED',
  EXECUTED: 'EXECUTED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED'
};
```

**Valid Transitions**:
- `PENDING_MAKER` → `PENDING_CHECKER`
- `PENDING_CHECKER` → `APPROVED` or `REJECTED`
- `APPROVED` → `EXECUTED` or `FAILED`

---

## 🔧 Configuration

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000

# Database (MySQL)
DATABASE_URL="mysql://root:password@localhost:3306/assetlink_custody"

# Security
API_KEY_SECRET=your-api-key-secret
HMAC_SECRET=your-hmac-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=info
```

---

### Math Configuration

```javascript
import Decimal from 'decimal.js';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_DOWN
});

export const MathConfig = {
  TOKEN_DECIMALS: 18,
  PRICE_DECIMALS: 2,
  FEE_DECIMALS: 4
};
```

**Why?** Prevents floating-point errors in financial calculations.

---

## 🛠️ Core Utilities

### Logger (Winston)

```javascript
import logger from './utils/logger.js';

logger.info('Server started');
logger.error('Database connection failed', { error });
logger.warn('Rate limit exceeded', { ip: req.ip });
```

**Features**:
- Structured logging
- Environment-aware log levels
- File logging in production

---

### Safe Math Operations

```javascript
import { SafeMath } from './config/math.config.js';

const total = SafeMath.add('100.50', '50.25'); // "150.75"
const fee = SafeMath.multiply('1000', '0.025'); // "25"
const isGreater = SafeMath.isGreaterThan('100', '50'); // true
```

**Why?** Ensures precision for token quantities and pricing.

---

### Idempotency

```javascript
import { generateIdempotencyKey } from './utils/idempotency.js';

const key = generateIdempotencyKey('MINT', { assetId: 'ROLEX-123' });
// Returns: SHA-256 hash
```

**Purpose**: Prevent duplicate operations.

---

## 🌐 API Endpoints

### Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T14:00:00.000Z",
  "service": "assetlink-custody",
  "version": "1.0.0"
}
```

---

### API Information

```http
GET /v1/
```

**Response**:
```json
{
  "service": "AssetLink Custody API",
  "version": "1.0.0",
  "description": "Secure Custody Infrastructure for Tokenized Real-World Assets",
  "endpoints": {
    "health": "/health",
    "assets": "/v1/assets",
    "tokens": "/v1/tokens",
    "vaults": "/v1/vaults",
    "operations": "/v1/operations"
  }
}
```

---

## 🔐 Security Features

### Middleware Stack

```javascript
// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: config.corsOrigins }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
```

---

### Error Handling

```javascript
import { BadRequestError, NotFoundError } from './errors/ApiError.js';

// Throw custom errors
throw new BadRequestError('Invalid asset ID');
throw new NotFoundError('Custody record not found');

// Global error handler catches all
app.use(errorHandler);
```

**Error Response Format**:
```json
{
  "error": {
    "message": "Invalid asset ID",
    "statusCode": 400,
    "timestamp": "2025-12-26T14:00:00.000Z"
  }
}
```

---

## 📦 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Create Database
```bash
mysql -u root -p
CREATE DATABASE assetlink_custody;
EXIT;
```

### 4. Run Migrations
```bash
npm run prisma:migrate
```

### 5. Start Server
```bash
npm run dev
```

Server runs on `http://localhost:3000`

---

## 📁 File Structure

```
src/
├── config/
│   ├── env.js           # Environment configuration
│   ├── db.js            # Prisma client
│   └── math.config.js   # Decimal precision
├── prisma/
│   └── schema.prisma    # Database schema
├── enums/
│   ├── custodyStatus.js
│   ├── operationStatus.js
│   ├── listingStatus.js
│   └── tradeStatus.js
├── errors/
│   ├── ApiError.js
│   ├── ValidationError.js
│   └── errorHandler.js
├── utils/
│   ├── logger.js
│   ├── idempotency.js
│   └── time.js
├── routes/
│   └── index.js
├── app.js               # Express configuration
└── server.js            # Server initialization
```

---

## ✅ Deliverables

- ✅ MySQL database with 5 core tables
- ✅ Prisma ORM configured and migrated
- ✅ 4 state machine enums with validation
- ✅ Winston logger with structured logging
- ✅ Safe math utilities with Decimal.js
- ✅ Global error handling
- ✅ Express app with security middleware
- ✅ OpenAPI documentation base
- ✅ Comprehensive README

---

## 🎯 Next Sprint

**Sprint 1 - Authentication & Trust Boundary**
- HMAC-SHA256 authentication
- API key management
- Request signature verification
- IP whitelisting
