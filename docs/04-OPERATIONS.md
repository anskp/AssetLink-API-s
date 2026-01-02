# Operations Module

## Overview
Implements maker-checker workflow for all sensitive custody operations (mint, burn, transfer).

## Endpoints

### Initiate Operation
```
POST /v1/operations
```

**Request Body:**
```json
{
  "custodyRecordId": "uuid",
  "operationType": "MINT",
  "payload": {
    "tokenSymbol": "ROLEX",
    "tokenName": "Rolex Watch Token",
    "totalSupply": "1",
    "decimals": 0
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "operationType": "MINT",
  "status": "PENDING_CHECKER",
  "custodyRecordId": "uuid",
  "payload": {...},
  "initiatedBy": "maker_user_id",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Initiate Mint Operation
```
POST /v1/operations/mint
```

**Request Body:**
```json
{
  "assetId": "ROLEX-2025-001",
  "tokenSymbol": "ROLEX",
  "tokenName": "Rolex Watch Token",
  "totalSupply": "1",
  "decimals": 0,
  "blockchainId": "ETH",
  "vaultWalletId": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "operationType": "MINT",
  "status": "PENDING_CHECKER",
  "payload": {...},
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Approve Operation
```
POST /v1/operations/:id/approve
```

**Response:**
```json
{
  "id": "uuid",
  "status": "APPROVED",
  "approvedBy": "checker_user_id",
  "approvedAt": "2024-01-01T00:00:00Z"
}
```

---

### Reject Operation
```
POST /v1/operations/:id/reject
```

**Request Body:**
```json
{
  "reason": "Insufficient documentation"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejectedBy": "checker_user_id",
  "rejectionReason": "Insufficient documentation",
  "rejectedAt": "2024-01-01T00:00:00Z"
}
```

---

### List Operations
```
GET /v1/operations
```

**Query Parameters:**
- `status`: PENDING_MAKER, PENDING_CHECKER, APPROVED, EXECUTED, REJECTED, FAILED
- `operationType`: MINT, TRANSFER, BURN
- `custodyRecordId`: Filter by custody record
- `limit`: Number of records (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "operations": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

### Get Operation Details
```
GET /v1/operations/:id
```

**Response:**
```json
{
  "id": "uuid",
  "operationType": "MINT",
  "status": "EXECUTED",
  "custodyRecordId": "uuid",
  "payload": {...},
  "initiatedBy": "maker_user_id",
  "approvedBy": "checker_user_id",
  "executedAt": "2024-01-01T00:00:00Z",
  "fireblocksTaskId": "fb_task_id",
  "txHash": "0x..."
}
```

---

## Operation Types

| Type | Description |
|------|-------------|
| MINT | Mint new tokens |
| TRANSFER | Transfer tokens between wallets |
| BURN | Burn tokens (redemption) |

---

## Operation Status Flow

```
PENDING_MAKER → PENDING_CHECKER → APPROVED → EXECUTED
                                  ↓
                              REJECTED
                                  ↓
                              FAILED
```

---

## Maker-Checker Rules

- ✅ Maker cannot approve their own operations
- ✅ Checker must have appropriate permissions
- ✅ Operations expire after 24 hours
- ✅ All actions are audited
- ✅ Idempotency keys prevent duplicates
