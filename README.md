# AssetLink Custody

**Secure Custody Infrastructure for Tokenized Real-World Assets (RWAs)**

AssetLink Custody is a custody-only backend system designed to securely manage blockchain tokens that represent verified real-world assets. Built on Fireblocks' MPC-CMP infrastructure, it provides bank-level security with a clean, developer-friendly API.

---

## 🏗️ Architecture Overview

### Service Boundaries
- **AssetLink Custody** = Custody + Ledger + Settlement Engine
- **Marketplace UI** = Consumer of these APIs
- **Blockchain** = Existence layer only

### Core Modules

#### `ledger/` (Off-Chain Ownership Ledger)
Tracks beneficial ownership, prevents double spending, and supports fractional ownership.

#### `marketplace/` (Listings & Trading)
The settlement brain for creating listings, validating balances, and executing off-chain trades.

#### `custody/` & `token-lifecycle/`
Separates vault metadata and status from mint/withdraw/burn execution.

### Golden Rule
> Ledger changes do not touch blockchain.  
> Blockchain changes do not update ownership ledger.  
> Only explicit workflows bridge them.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd assetlink-custody
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

4. **Set up database**
```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE assetlink_custody;
EXIT;

# Run Prisma migrations
npm run prisma:migrate
```

5. **Generate Prisma client**
```bash
npm run prisma:generate
```

6. **Start development server**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

---

## 📁 Project Structure

```
assetlink-custody/
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Server initialization
│   │
│   ├── config/                   # Configuration files
│   │   ├── env.js               # Environment variables
│   │   ├── db.js                # Prisma client
│   │   ├── fireblocks.js        # Fireblocks config
│   │   └── math.config.js       # Decimal precision
│   │
│   ├── prisma/                   # Database schema
│   │   ├── schema.prisma        # Prisma schema
│   │   └── seed.js              # Database seeding
│   │
│   ├── routes/                   # API routes
│   │   ├── index.js             # Route aggregator
│   │   ├── custody.routes.js    # Asset linking & custody
│   │   ├── operation.routes.js  # Maker-checker workflows
│   │   ├── vault.routes.js      # Fireblocks vaults
│   │   ├── ledger.routes.js     # Ownership ledger
│   │   ├── marketplace.routes.js# Listings & trades
│   │   └── audit.routes.js      # Audit trail
│   │
│   ├── modules/                  # Business logic modules
│   │   ├── auth/                # Authentication
│   │   ├── custody/             # Custody management
│   │   ├── asset-linking/       # Asset registration
│   │   ├── token-lifecycle/     # Mint/burn/transfer
│   │   ├── operations/          # Maker-checker engine
│   │   ├── ledger/              # Off-chain ownership
│   │   ├── marketplace/         # Trading & settlement
│   │   ├── fireblocks/          # Fireblocks integration
│   │   └── audit/               # Audit logging
│   │
│   ├── enums/                    # Status enumerations
│   ├── errors/                   # Error handling
│   └── utils/                    # Utilities
│
├── tests/                        # Test suites
├── openapi/                      # API documentation
└── docker-compose.yml            # Docker configuration
```

---

## 🔧 Development

### Available Scripts

```bash
npm run dev              # Start development server with hot reload
npm start                # Start production server
npm test                 # Run tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

---

## 📖 API Documentation

API documentation is available in OpenAPI 3.0 format at `/openapi/openapi.yaml`.

### Authentication

All API requests require HMAC-SHA256 signature authentication:

```
X-API-KEY: <public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>
```

Signature payload: `METHOD + PATH + TIMESTAMP + BODY`

### Key Endpoints

- `GET /health` - Health check
- `GET /v1/` - API information
- `POST /v1/assets/link` - Link asset to custody
- `POST /v1/tokens/mint` - Mint token
- `GET /v1/vaults` - List vaults
- `POST /v1/operations/{id}/approve` - Approve operation

---

## 🔐 Security

- **MPC-CMP** key management via Fireblocks
- **No private keys** exposed to the platform
- **Maker-checker** enforcement for all sensitive operations
- **HMAC authentication** for API requests
- **Rate limiting** to prevent abuse
- **IP whitelisting** support

---

## 🏃 Sprint Development

This project follows a sprint-based development approach:

- **Sprint 0**: Project initialization ✅ (Current)
- **Sprint 1**: Authentication & trust boundary
- **Sprint 2**: Core data model & audit
- **Sprint 3**: Asset linking service
- **Sprint 4**: Maker-checker engine
- **Sprint 5**: Fireblocks integration
- **Sprint 6**: Token minting
- **Sprint 7**: Off-chain trading
- **Sprint 8**: Withdrawal flows
- **Sprint 9**: Redemption & burning
- **Sprint 10**: Production hardening

---

## 📝 License

Proprietary - Copyright © 2025 Copym

---

## 🤝 Support

For support and questions, contact: support@assetlink.com

