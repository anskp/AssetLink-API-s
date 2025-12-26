# Sprint 1 - Authentication & Trust Boundary

**Status**: 🚧 In Progress  
**Duration**: Security Sprint  
**Goal**: Implement HMAC-SHA256 authentication for secure server-to-server API access

---

## 📋 Overview

Sprint 1 establishes the security foundation for AssetLink Custody by implementing HMAC-based authentication, API key management, and IP whitelisting. This ensures all API requests are authenticated, tamper-proof, and protected against replay attacks.

---

## 🎯 Objectives

1. ⏳ Implement HMAC-SHA256 signature verification
2. ⏳ Create API key management system
3. ⏳ Build authentication middleware
4. ⏳ Add IP whitelisting support
5. ⏳ Prevent replay attacks with timestamp validation
6. ⏳ Document authentication flow

---

## 🔐 Authentication Flow

### How It Works

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │ Server  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │ 1. Generate Signature                        │
     │    payload = METHOD + PATH + TIMESTAMP + BODY│
     │    signature = HMAC-SHA256(payload, SECRET)  │
     │                                              │
     │ 2. Send Request with Headers                 │
     │    X-API-KEY: <public_key>                   │
     │    X-SIGNATURE: <signature>                  │
     │    X-TIMESTAMP: <unix_timestamp>             │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                         3. Validate
     │                                         - Timestamp (5 min window)
     │                                         - API key exists & active
     │                                         - IP whitelisted
     │                                         - Signature matches
     │                                              │
     │ 4. Response (200 or 401/403)                 │
     │<─────────────────────────────────────────────┤
     │                                              │
```

---

## 🔑 API Key Structure

### Database Schema

```prisma
model ApiKey {
  id            String   @id @default(uuid())
  publicKey     String   @unique          // Sent in X-API-KEY header
  secretKeyHash String                    // Hashed with bcrypt
  tenantId      String?                   // Multi-tenancy support
  permissions   Json                      // ["read", "write", "admin"]
  ipWhitelist   Json?                     // ["192.168.1.1", "10.0.0.0/24"]
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Example API Key

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": "ak_live_abc123xyz789",
  "secretKeyHash": "$2b$10$...",
  "permissions": ["read", "write"],
  "ipWhitelist": ["192.168.1.100"],
  "isActive": true
}
```

---

## 🛡️ HMAC Signature

### Signature Generation

```javascript
import crypto from 'crypto';

function generateSignature(method, path, timestamp, body, secret) {
  // 1. Build payload
  const payload = method + path + timestamp + (body || '');
  
  // 2. Create HMAC
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  
  // 3. Return hex digest
  return hmac.digest('hex');
}
```

### Example

```javascript
const method = 'POST';
const path = '/v1/assets/link';
const timestamp = '1735209600';
const body = JSON.stringify({ assetId: 'ROLEX-123' });
const secret = 'sk_test_secret123';

const signature = generateSignature(method, path, timestamp, body, secret);
// Returns: "a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9"
```

---

## 📡 API Endpoints

### Create API Key

```http
POST /v1/auth/keys
Content-Type: application/json
X-API-KEY: <admin_public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>

{
  "tenantId": "tenant_123",
  "permissions": ["read", "write"],
  "ipWhitelist": ["192.168.1.100", "10.0.0.0/24"]
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": "ak_live_abc123xyz789",
  "secretKey": "sk_live_secret123456789",
  "permissions": ["read", "write"],
  "ipWhitelist": ["192.168.1.100", "10.0.0.0/24"],
  "isActive": true,
  "createdAt": "2025-12-26T14:00:00.000Z"
}
```

> ⚠️ **Important**: The `secretKey` is only returned once during creation. Store it securely!

---

### List API Keys

```http
GET /v1/auth/keys
X-API-KEY: <admin_public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>
```

**Response** (200 OK):
```json
{
  "keys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "publicKey": "ak_live_abc123xyz789",
      "permissions": ["read", "write"],
      "isActive": true,
      "createdAt": "2025-12-26T14:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Get API Key

```http
GET /v1/auth/keys/:id
X-API-KEY: <admin_public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": "ak_live_abc123xyz789",
  "permissions": ["read", "write"],
  "ipWhitelist": ["192.168.1.100"],
  "isActive": true,
  "createdAt": "2025-12-26T14:00:00.000Z",
  "updatedAt": "2025-12-26T14:00:00.000Z"
}
```

---

### Update API Key

```http
PATCH /v1/auth/keys/:id
Content-Type: application/json
X-API-KEY: <admin_public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>

{
  "permissions": ["read"],
  "ipWhitelist": ["192.168.1.100", "192.168.1.101"]
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "publicKey": "ak_live_abc123xyz789",
  "permissions": ["read"],
  "ipWhitelist": ["192.168.1.100", "192.168.1.101"],
  "isActive": true,
  "updatedAt": "2025-12-26T14:05:00.000Z"
}
```

---

### Revoke API Key

```http
DELETE /v1/auth/keys/:id
X-API-KEY: <admin_public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>
```

**Response** (200 OK):
```json
{
  "message": "API key revoked successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔒 Authentication Middleware

### Implementation

```javascript
import { verifySignature } from '../modules/auth/hmac.service.js';
import { findByPublicKey } from '../modules/auth/apiKey.repository.js';
import { UnauthorizedError, ForbiddenError } from '../errors/ApiError.js';

export const authenticate = async (req, res, next) => {
  try {
    // 1. Extract headers
    const publicKey = req.headers['x-api-key'];
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!publicKey || !signature || !timestamp) {
      throw new UnauthorizedError('Missing authentication headers');
    }
    
    // 2. Validate timestamp (5-minute window)
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - parseInt(timestamp));
    if (diff > 300) {
      throw new UnauthorizedError('Request timestamp expired');
    }
    
    // 3. Find API key
    const apiKey = await findByPublicKey(publicKey);
    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedError('Invalid API key');
    }
    
    // 4. Check IP whitelist
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
      const clientIp = req.ip;
      if (!apiKey.ipWhitelist.includes(clientIp)) {
        throw new ForbiddenError('IP not whitelisted');
      }
    }
    
    // 5. Verify signature
    const isValid = await verifySignature(
      signature,
      req.method,
      req.path,
      timestamp,
      req.body,
      apiKey.secretKeyHash
    );
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid signature');
    }
    
    // 6. Attach context to request
    req.auth = {
      apiKeyId: apiKey.id,
      tenantId: apiKey.tenantId,
      permissions: apiKey.permissions
    };
    
    next();
  } catch (error) {
    next(error);
  }
};
```

---

## 🚨 Error Responses

### Unauthorized (401)

```json
{
  "error": {
    "message": "Missing authentication headers",
    "statusCode": 401,
    "timestamp": "2025-12-26T14:00:00.000Z"
  }
}
```

### Forbidden (403)

```json
{
  "error": {
    "message": "IP not whitelisted",
    "statusCode": 403,
    "timestamp": "2025-12-26T14:00:00.000Z"
  }
}
```

### Invalid Signature (401)

```json
{
  "error": {
    "message": "Invalid signature",
    "statusCode": 401,
    "timestamp": "2025-12-26T14:00:00.000Z"
  }
}
```

### Expired Timestamp (401)

```json
{
  "error": {
    "message": "Request timestamp expired",
    "statusCode": 401,
    "timestamp": "2025-12-26T14:00:00.000Z"
  }
}
```

---

## 🧪 Testing

### Generate Test API Key

```bash
node scripts/generate-api-key.js
```

**Output**:
```
✅ API Key Created Successfully

Public Key:  ak_test_abc123xyz789
Secret Key:  sk_test_secret123456789

⚠️  Save the secret key securely. It will not be shown again.
```

---

### Test Authentication

```javascript
// test-auth.js
import crypto from 'crypto';

const publicKey = 'ak_test_abc123xyz789';
const secretKey = 'sk_test_secret123456789';

const method = 'GET';
const path = '/v1/';
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = '';

// Generate signature
const payload = method + path + timestamp + body;
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(payload)
  .digest('hex');

// Make request
fetch('http://localhost:3000/v1/', {
  headers: {
    'X-API-KEY': publicKey,
    'X-SIGNATURE': signature,
    'X-TIMESTAMP': timestamp
  }
})
.then(res => res.json())
.then(data => console.log('✅ Authenticated:', data))
.catch(err => console.error('❌ Failed:', err));
```

---

## 📁 File Structure

```
src/
├── modules/
│   └── auth/
│       ├── hmac.service.js       # HMAC signature logic
│       ├── apiKey.repository.js  # Database operations
│       └── auth.middleware.js    # Authentication middleware
├── routes/
│   └── auth.routes.js            # API key management endpoints
├── utils/
│   └── crypto.js                 # Cryptographic utilities
└── scripts/
    └── generate-api-key.js       # CLI key generation
```

---

## 🔐 Security Features

### 1. **Replay Attack Prevention**
- Timestamp validation with 5-minute window
- Prevents reuse of old requests

### 2. **Tampering Prevention**
- HMAC signature over entire request
- Any modification invalidates signature

### 3. **IP Whitelisting**
- Optional IP-based access control
- Supports CIDR notation

### 4. **Secret Hashing**
- API secrets stored as bcrypt hashes
- Never stored in plaintext

### 5. **Permission Scoping**
- Fine-grained access control
- `read`, `write`, `admin` permissions

---

## ✅ Deliverables

- ⏳ HMAC signature service
- ⏳ API key repository
- ⏳ Authentication middleware
- ⏳ IP whitelisting logic
- ⏳ API key management endpoints
- ⏳ Test key generation script
- ⏳ Updated OpenAPI documentation

---

## 🎯 Next Sprint

**Sprint 2 - Core Data Model & Audit Infrastructure**
- Audit logging service
- Custody record lifecycle
- Operation state machine
- Append-only audit trail
