# Authentication Module

## Overview
Handles user authentication, JWT tokens, and API key management.

## Endpoints

### User Authentication

#### Register User
```
POST /v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CLIENT"
  },
  "accessToken": "jwt_token"
}
```

---

#### Login User
```
POST /v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CLIENT"
  },
  "accessToken": "jwt_token"
}
```

**Notes:**
- Refresh token is set as httpOnly cookie
- Access token expires in 15 minutes
- Refresh token expires in 7 days

---

#### Refresh Token
```
POST /v1/auth/refresh
```

**Headers:**
- Cookie: `refreshToken=...`

**Response:**
```json
{
  "accessToken": "new_jwt_token"
}
```

---

#### Logout
```
POST /v1/auth/logout
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

#### Get Current User
```
GET /v1/auth/me
```

**Headers:**
- Authorization: `Bearer {accessToken}`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "CLIENT"
}
```

---

### API Key Management (Client)

#### List My API Keys
```
GET /v1/auth/keys/my
```

**Headers:**
- Authorization: `Bearer {accessToken}`

**Response:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "publicKey": "pk_...",
      "permissions": ["read", "write"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### Generate API Key
```
POST /v1/auth/keys/my
```

**Headers:**
- Authorization: `Bearer {accessToken}`

**Response:**
```json
{
  "id": "uuid",
  "publicKey": "pk_...",
  "secretKey": "sk_...",
  "permissions": ["read", "write"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**⚠️ Important:** Secret key is only shown once!

---

#### Revoke API Key
```
DELETE /v1/auth/keys/my/:id
```

**Headers:**
- Authorization: `Bearer {accessToken}`

**Response:**
```json
{
  "message": "API key revoked"
}
```

---

### Admin Authentication

#### Admin Login
```
POST /v1/admin/login
```

**Request Body:**
```json
{
  "email": "admin@assetlink.io",
  "password": "admin_password"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@assetlink.io",
    "role": "ADMIN"
  },
  "accessToken": "jwt_token"
}
```

**Notes:**
- Only users with ADMIN role can login
- Separate endpoint for security

---

## Authentication Methods

### 1. JWT Authentication (User Sessions)
Used for web dashboard and user sessions.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Token Payload:**
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "CLIENT",
  "iat": 1234567890,
  "exp": 1234568790
}
```

---

### 2. API Key Authentication (Programmatic Access)
Used for server-to-server API calls.

**Headers:**
```
X-API-KEY: pk_your_public_key
X-SIGNATURE: hmac_sha256_signature
X-TIMESTAMP: unix_timestamp
```

**Signature Calculation:**
```javascript
const payload = METHOD + PATH + TIMESTAMP + JSON.stringify(BODY);
const signature = crypto
  .createHmac('sha256', secretKey)
  .update(payload)
  .digest('hex');
```

---

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT with short expiration (15 min)
- ✅ Refresh tokens in httpOnly cookies
- ✅ HMAC signature verification for API keys
- ✅ Timestamp validation (5-minute window)
- ✅ IP whitelisting support
- ✅ Role-based access control (RBAC)

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Email and password are required",
    "statusCode": 400
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Invalid email or password",
    "statusCode": 401
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "User with this email already exists",
    "statusCode": 409
  }
}
```
