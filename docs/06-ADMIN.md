# Admin Module

## Overview
Administrative endpoints for system management (ADMIN role required).

## Endpoints

### Get System Statistics
```
GET /v1/admin/stats
```

**Response:**
```json
{
  "users": {
    "total": 100,
    "active": 95,
    "suspended": 5
  },
  "apiKeys": {
    "total": 150,
    "active": 140,
    "revoked": 10
  },
  "assets": {
    "total": 500
  },
  "operations": {
    "total": 1000
  }
}
```

---

### List All Users
```
GET /v1/admin/users
```

**Query Parameters:**
- `status`: ACTIVE, SUSPENDED
- `role`: CLIENT, ADMIN
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 50)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "CLIENT",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z",
      "_count": {
        "apiKeys": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

---

### Get User Details
```
GET /v1/admin/users/:id
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "CLIENT",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z",
  "apiKeys": [
    {
      "id": "uuid",
      "publicKey": "pk_...",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Update User Status
```
PATCH /v1/admin/users/:id/status
```

**Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "CLIENT",
  "status": "SUSPENDED",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### List All API Keys
```
GET /v1/admin/api-keys
```

**Query Parameters:**
- `isActive`: true, false
- `page`: Page number
- `limit`: Records per page

**Response:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "publicKey": "pk_...",
      "userId": "uuid",
      "user": {
        "email": "user@example.com",
        "role": "CLIENT"
      },
      "permissions": ["read", "write"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### List All Assets
```
GET /v1/admin/assets
```

**Query Parameters:**
- `status`: UNLINKED, LINKED, MINTED, WITHDRAWN, BURNED
- `page`: Page number
- `limit`: Records per page

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "assetId": "ROLEX-2025-001",
      "status": "MINTED",
      "blockchain": "ETH",
      "tokenAddress": "0x...",
      "tokenId": "1",
      "vaultWallet": {
        "fireblocksId": "0",
        "blockchain": "ETH",
        "address": "0x..."
      },
      "assetMetadata": {...}
    }
  ],
  "pagination": {...}
}
```

---

### Get Audit Logs
```
GET /v1/admin/audit-logs
```

**Query Parameters:**
- `eventType`: Filter by event type
- `page`: Page number
- `limit`: Records per page (default: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "eventType": "ASSET_LINKED",
      "actor": "user_id",
      "metadata": {...},
      "ipAddress": "192.168.1.1",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

## Admin Permissions

- ✅ View all users and their data
- ✅ Suspend/activate user accounts
- ✅ View all API keys (not secrets)
- ✅ View all custody records
- ✅ View all operations
- ✅ View audit logs
- ❌ Cannot delete data (audit compliance)
- ❌ Cannot modify other admins

---

## Security Notes

- Admin endpoints require ADMIN role in JWT
- All admin actions are logged
- Admin cannot approve their own operations
- IP restrictions recommended for admin access
