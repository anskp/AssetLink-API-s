# AssetLink Custody - API Testing Guide

Complete curl command reference with request/response examples for all endpoints.

## Base URL
```
http://localhost:3000
```

## Authentication
All API endpoints require authentication. For testing, you'll need to:
1. Create an API key
2. Use the API key in requests

---

## 1. Health Check

### GET /health
Check if the server is running.

**Request:**
```bash
curl -X GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T23:13:12.000Z",
  "service": "assetlink-custody",
  "version": "1.0.0"
}
```

---

## 2. Vault Management APIs

### POST /v1/vaults
Create a new Fireblocks vault with wallets for all supported blockchains.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/vaults \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "vaultName": "TEST_VAULT_001",
    "customerRefId": "customer-123",
    "vaultType": "CUSTODY"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vaultId": "fb-vault-abc123",
    "vaultName": "TEST_VAULT_001",
    "wallets": [
      {
        "id": "uuid-1",
        "fireblocksId": "fb-vault-abc123",
        "blockchain": "ETH_TEST5",
        "address": "0x1234...5678",
        "vaultType": "CUSTODY",
        "isActive": true,
        "createdAt": "2025-12-26T23:15:00.000Z"
      },
      {
        "id": "uuid-2",
        "fireblocksId": "fb-vault-abc123",
        "blockchain": "MATIC_MUMBAI",
        "address": "0xabcd...efgh",
        "vaultType": "CUSTODY",
        "isActive": true,
        "createdAt": "2025-12-26T23:15:01.000Z"
      }
    ],
    "errors": []
  }
}
```

### GET /v1/vaults/:vaultId
Get vault details including all wallets and balances.

**Request:**
```bash
curl -X GET http://localhost:3000/v1/vaults/fb-vault-abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vaultId": "fb-vault-abc123",
    "vaultName": "TEST_VAULT_001",
    "wallets": [
      {
        "id": "uuid-1",
        "blockchain": "ETH_TEST5",
        "address": "0x1234...5678",
        "balance": "0",
        "vaultType": "CUSTODY",
        "isActive": true,
        "createdAt": "2025-12-26T23:15:00.000Z"
      }
    ]
  }
}
```

### GET /v1/vaults/:vaultId/wallets
List all wallets for a vault.

**Request:**
```bash
curl -X GET http://localhost:3000/v1/vaults/fb-vault-abc123/wallets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "blockchain": "ETH_TEST5",
        "address": "0x1234...5678",
        "balance": "0"
      },
      {
        "blockchain": "MATIC_MUMBAI",
        "address": "0xabcd...efgh",
        "balance": "0"
      }
    ]
  }
}
```

---

## 3. Asset Linking APIs

### POST /v1/assets/link
Link a verified physical asset to custody.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/assets/link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "assetId": "ROLEX-2025-001",
    "assetType": "WATCH",
    "assetName": "Rolex Submariner",
    "description": "Luxury dive watch",
    "manufacturer": "Rolex",
    "model": "Submariner",
    "serialNumber": "SN123456",
    "yearManufactured": 2025,
    "estimatedValue": "15000",
    "currency": "USD",
    "images": ["https://example.com/image1.jpg"],
    "documents": ["https://example.com/cert.pdf"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "custodyRecord": {
      "id": "custody-uuid-1",
      "assetId": "ROLEX-2025-001",
      "status": "LINKED",
      "linkedAt": "2025-12-26T23:20:00.000Z"
    },
    "metadata": {
      "id": "metadata-uuid-1",
      "assetType": "WATCH",
      "assetName": "Rolex Submariner",
      "estimatedValue": "15000"
    }
  }
}
```

### GET /v1/assets/:assetId
Get asset custody status and details.

**Request:**
```bash
curl -X GET http://localhost:3000/v1/assets/ROLEX-2025-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "custodyRecord": {
      "id": "custody-uuid-1",
      "assetId": "ROLEX-2025-001",
      "status": "LINKED",
      "blockchain": null,
      "tokenAddress": null,
      "linkedAt": "2025-12-26T23:20:00.000Z"
    },
    "metadata": {
      "assetType": "WATCH",
      "assetName": "Rolex Submariner",
      "description": "Luxury dive watch"
    }
  }
}
```

---

## 4. Token Minting APIs

### POST /v1/operations/mint
Initiate a token minting operation (MAKER role).

**Request:**
```bash
curl -X POST http://localhost:3000/v1/operations/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "assetId": "ROLEX-2025-001",
    "tokenSymbol": "RLXSUB",
    "tokenName": "Rolex Submariner Token",
    "totalSupply": "1",
    "decimals": "0",
    "blockchainId": "ETH_TEST5",
    "vaultWalletId": "uuid-1"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "operation-uuid-1",
    "operationType": "MINT",
    "status": "PENDING_CHECKER",
    "custodyRecordId": "custody-uuid-1",
    "payload": {
      "assetId": "ROLEX-2025-001",
      "tokenSymbol": "RLXSUB",
      "tokenName": "Rolex Submariner Token",
      "totalSupply": "1",
      "decimals": "0",
      "blockchainId": "ETH_TEST5"
    },
    "initiatedBy": "maker-user-id",
    "createdAt": "2025-12-26T23:25:00.000Z"
  }
}
```

### POST /v1/operations/:operationId/approve
Approve a minting operation (CHECKER role).

**Request:**
```bash
curl -X POST http://localhost:3000/v1/operations/operation-uuid-1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "checker-user-id"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "operation-uuid-1",
    "operationType": "MINT",
    "status": "EXECUTED",
    "approvedBy": "checker-user-id",
    "fireblocksTaskId": "fb-task-xyz789",
    "executedAt": "2025-12-26T23:26:00.000Z"
  }
}
```

### POST /v1/operations/:operationId/reject
Reject a minting operation (CHECKER role).

**Request:**
```bash
curl -X POST http://localhost:3000/v1/operations/operation-uuid-1/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "checker-user-id",
    "reason": "Insufficient documentation"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "operation-uuid-1",
    "operationType": "MINT",
    "status": "REJECTED",
    "rejectedBy": "checker-user-id",
    "rejectionReason": "Insufficient documentation",
    "updatedAt": "2025-12-26T23:27:00.000Z"
  }
}
```

### GET /v1/operations/:operationId
Get operation details with audit logs (for real-time monitoring).

**Request:**
```bash
curl -X GET http://localhost:3000/v1/operations/operation-uuid-1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "operation-uuid-1",
    "operationType": "MINT",
    "status": "EXECUTED",
    "fireblocksTaskId": "fb-task-xyz789",
    "txHash": "0xabc123...def456",
    "auditLogs": [
      {
        "id": "audit-1",
        "eventType": "OPERATION_CREATED",
        "actor": "maker-user-id",
        "timestamp": "2025-12-26T23:25:00.000Z"
      },
      {
        "id": "audit-2",
        "eventType": "OPERATION_APPROVED",
        "actor": "checker-user-id",
        "timestamp": "2025-12-26T23:26:00.000Z"
      },
      {
        "id": "audit-3",
        "eventType": "ON_CHAIN_SUBMISSION",
        "actor": "system",
        "timestamp": "2025-12-26T23:26:10.000Z"
      },
      {
        "id": "audit-4",
        "eventType": "TOKEN_MINTED",
        "actor": "system",
        "metadata": {
          "txHash": "0xabc123...def456"
        },
        "timestamp": "2025-12-26T23:27:00.000Z"
      }
    ]
  }
}
```

### GET /v1/operations
List all operations with filters.

**Request:**
```bash
curl -X GET "http://localhost:3000/v1/operations?status=PENDING_CHECKER&operationType=MINT" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "operation-uuid-2",
      "operationType": "MINT",
      "status": "PENDING_CHECKER",
      "initiatedBy": "maker-user-id",
      "createdAt": "2025-12-26T23:30:00.000Z"
    }
  ]
}
```

---

## 5. Marketplace APIs

### POST /v1/marketplace/listings
Create a new listing.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/marketplace/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "assetId": "ROLEX-2025-001",
    "price": "16000",
    "currency": "USD",
    "expiryDate": "2025-12-31T23:59:59.000Z",
    "sellerId": "user-123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "listing-uuid-1",
    "assetId": "ROLEX-2025-001",
    "custodyRecordId": "custody-uuid-1",
    "sellerId": "user-123",
    "price": "16000",
    "currency": "USD",
    "status": "ACTIVE",
    "expiryDate": "2025-12-31T23:59:59.000Z",
    "createdAt": "2025-12-26T23:35:00.000Z"
  }
}
```

### GET /v1/marketplace/listings
List active listings with filters.

**Request:**
```bash
curl -X GET "http://localhost:3000/v1/marketplace/listings?assetType=WATCH&sortBy=price&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "listing-uuid-1",
      "assetId": "ROLEX-2025-001",
      "price": "16000",
      "currency": "USD",
      "status": "ACTIVE",
      "asset": {
        "assetId": "ROLEX-2025-001",
        "assetMetadata": {
          "assetType": "WATCH",
          "assetName": "Rolex Submariner",
          "images": ["https://example.com/image1.jpg"]
        }
      },
      "bidCount": 2,
      "highestBid": "16500"
    }
  ]
}
```

### GET /v1/marketplace/listings/:listingId
Get listing details.

**Request:**
```bash
curl -X GET http://localhost:3000/v1/marketplace/listings/listing-uuid-1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "listing-uuid-1",
    "assetId": "ROLEX-2025-001",
    "price": "16000",
    "status": "ACTIVE",
    "asset": {
      "assetId": "ROLEX-2025-001",
      "blockchain": "ETH_TEST5",
      "tokenAddress": "0xtoken123",
      "assetMetadata": {
        "assetType": "WATCH",
        "assetName": "Rolex Submariner",
        "description": "Luxury dive watch",
        "images": ["https://example.com/image1.jpg"],
        "verifiedBy": "expert-001",
        "verificationDate": "2025-12-26T00:00:00.000Z"
      }
    },
    "bids": [
      {
        "id": "bid-uuid-1",
        "buyerId": "user-456",
        "amount": "16500",
        "status": "PENDING",
        "createdAt": "2025-12-26T23:40:00.000Z"
      }
    ],
    "bidCount": 1,
    "highestBid": "16500"
  }
}
```

### PUT /v1/marketplace/listings/:listingId/cancel
Cancel a listing.

**Request:**
```bash
curl -X PUT http://localhost:3000/v1/marketplace/listings/listing-uuid-1/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user-123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "listing-uuid-1",
    "status": "CANCELLED",
    "updatedAt": "2025-12-26T23:45:00.000Z"
  }
}
```

### POST /v1/marketplace/listings/:listingId/bids
Place a bid on a listing.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/marketplace/listings/listing-uuid-1/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": "16500",
    "buyerId": "user-456"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bid-uuid-1",
    "listingId": "listing-uuid-1",
    "buyerId": "user-456",
    "amount": "16500",
    "status": "PENDING",
    "createdAt": "2025-12-26T23:40:00.000Z"
  }
}
```

### GET /v1/marketplace/listings/:listingId/bids
Get all bids for a listing.

**Request:**
```bash
curl -X GET http://localhost:3000/v1/marketplace/listings/listing-uuid-1/bids \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bid-uuid-1",
      "buyerId": "user-456",
      "amount": "16500",
      "status": "PENDING",
      "createdAt": "2025-12-26T23:40:00.000Z"
    },
    {
      "id": "bid-uuid-2",
      "buyerId": "user-789",
      "amount": "16200",
      "status": "PENDING",
      "createdAt": "2025-12-26T23:41:00.000Z"
    }
  ]
}
```

### POST /v1/marketplace/bids/:bidId/accept
Accept a bid (executes off-chain trade).

**Request:**
```bash
curl -X POST http://localhost:3000/v1/marketplace/bids/bid-uuid-1/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sellerId": "user-123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bid": {
      "id": "bid-uuid-1",
      "status": "ACCEPTED",
      "updatedAt": "2025-12-26T23:50:00.000Z"
    },
    "listing": {
      "id": "listing-uuid-1",
      "status": "SOLD",
      "updatedAt": "2025-12-26T23:50:00.000Z"
    }
  }
}
```

### POST /v1/marketplace/bids/:bidId/reject
Reject a bid.

**Request:**
```bash
curl -X POST http://localhost:3000/v1/marketplace/bids/bid-uuid-2/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sellerId": "user-123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bid-uuid-2",
    "status": "REJECTED",
    "updatedAt": "2025-12-26T23:51:00.000Z"
  }
}
```

---

## 6. Audit APIs

### GET /v1/audit/:custodyRecordId
Get audit trail for a custody record.

**Request:**
```bash
curl -X GET http://localhost:3000/v1/audit/custody-uuid-1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-1",
      "eventType": "ASSET_LINKED",
      "actor": "maker-user-id",
      "metadata": {
        "assetId": "ROLEX-2025-001"
      },
      "timestamp": "2025-12-26T23:20:00.000Z"
    },
    {
      "id": "audit-2",
      "eventType": "OPERATION_CREATED",
      "actor": "maker-user-id",
      "timestamp": "2025-12-26T23:25:00.000Z"
    },
    {
      "id": "audit-3",
      "eventType": "TOKEN_MINTED",
      "actor": "system",
      "metadata": {
        "txHash": "0xabc123...def456"
      },
      "timestamp": "2025-12-26T23:27:00.000Z"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Missing required parameters: tokenSymbol, tokenName"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": 401,
    "message": "User authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": 403,
    "message": "Maker cannot approve their own operation"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": 404,
    "message": "Asset ROLEX-2025-999 not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": 409,
    "message": "Asset ROLEX-2025-001 already has pending operations"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": 500,
    "message": "Fireblocks configuration missing"
  }
}
```

---

## Testing Workflow

### Complete End-to-End Flow

1. **Create Vault**
   ```bash
   curl -X POST http://localhost:3000/v1/vaults -H "Content-Type: application/json" -d '{"vaultName":"TEST_VAULT","customerRefId":"test-001"}'
   ```

2. **Link Asset**
   ```bash
   curl -X POST http://localhost:3000/v1/assets/link -H "Content-Type: application/json" -d '{"assetId":"ROLEX-001","assetType":"WATCH","assetName":"Rolex"}'
   ```

3. **Initiate Mint (Maker)**
   ```bash
   curl -X POST http://localhost:3000/v1/operations/mint -H "Content-Type: application/json" -d '{"assetId":"ROLEX-001","tokenSymbol":"RLX","tokenName":"Rolex Token","totalSupply":"1","decimals":"0","blockchainId":"ETH_TEST5"}'
   ```

4. **Approve Mint (Checker)**
   ```bash
   curl -X POST http://localhost:3000/v1/operations/{operationId}/approve -H "Content-Type: application/json" -d '{"userId":"checker-id"}'
   ```

5. **Monitor Status**
   ```bash
   curl -X GET http://localhost:3000/v1/operations/{operationId}
   ```

6. **Create Listing**
   ```bash
   curl -X POST http://localhost:3000/v1/marketplace/listings -H "Content-Type: application/json" -d '{"assetId":"ROLEX-001","price":"15000","currency":"USD","expiryDate":"2025-12-31T23:59:59Z","sellerId":"user-123"}'
   ```

7. **Place Bid**
   ```bash
   curl -X POST http://localhost:3000/v1/marketplace/listings/{listingId}/bids -H "Content-Type: application/json" -d '{"amount":"16000","buyerId":"user-456"}'
   ```

8. **Accept Bid (Off-Chain Trade)**
   ```bash
   curl -X POST http://localhost:3000/v1/marketplace/bids/{bidId}/accept -H "Content-Type: application/json" -d '{"sellerId":"user-123"}'
   ```

---

## Notes

- All timestamps are in ISO 8601 format
- All monetary amounts are strings to preserve precision
- Token stays in Fireblocks custody vault during marketplace trades
- Ownership transfers happen off-chain in the database
- Real-time Fireblocks logs are available via the operations endpoint
- Audit logs are immutable and append-only

