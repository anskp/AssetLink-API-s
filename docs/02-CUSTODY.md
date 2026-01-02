# Custody Module

## Overview
Manages asset linking to custody and tracks custody status throughout the asset lifecycle.

## Endpoints

### Link Asset to Custody
```
POST /v1/custody/link
```

**Description:** Links a verified real-world asset to custody system.

**Headers:**
- X-API-KEY: `pk_your_public_key`
- X-SIGNATURE: `hmac_signature`
- X-TIMESTAMP: `unix_timestamp`

**Request Body:**
```json
{
  "assetId": "ROLEX-2025-001"
}
```

**Response:**
```json
{
  "id": "uuid",
  "assetId": "ROLEX-2025-001",
  "status": "LINKED",
  "blockchain": null,
  "tokenStandard": null,
  "tokenAddress": null,
  "tokenId": null,
  "quantity": null,
  "vaultWalletId": null,
  "linkedAt": "2024-01-01T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Status Codes:**
- 201: Asset linked successfully
- 400: Invalid request
- 409: Asset already linked

---

### Get Custody Status
```
GET /v1/custody/:assetId
```

**Description:** Get current custody status of an asset.

**Headers:**
- X-API-KEY: `pk_your_public_key`
- X-SIGNATURE: `hmac_signature`
- X-TIMESTAMP: `unix_timestamp`

**Response:**
```json
{
  "id": "uuid",
  "assetId": "ROLEX-2025-001",
  "status": "MINTED",
  "blockchain": "ETH",
  "tokenStandard": "ERC721",
  "tokenAddress": "0x...",
  "tokenId": "1",
  "quantity": "1",
  "vaultWalletId": "uuid",
  "linkedAt": "2024-01-01T00:00:00Z",
  "mintedAt": "2024-01-01T01:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T01:00:00Z"
}
```

**Status Codes:**
- 200: Success
- 404: Asset not found

---

### List Custody Records
```
GET /v1/custody
```

**Description:** List all custody records with optional filters.

**Headers:**
- X-API-KEY: `pk_your_public_key`
- X-SIGNATURE: `hmac_signature`
- X-TIMESTAMP: `unix_timestamp`

**Query Parameters:**
- `status` (optional): Filter by status (UNLINKED, LINKED, MINTED, WITHDRAWN, BURNED)
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "records": [
    {
      "id": "uuid",
      "assetId": "ROLEX-2025-001",
      "status": "MINTED",
      "blockchain": "ETH",
      "tokenStandard": "ERC721",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

### Get Custody Statistics
```
GET /v1/custody/stats
```

**Description:** Get custody system statistics.

**Headers:**
- X-API-KEY: `pk_your_public_key`
- X-SIGNATURE: `hmac_signature`
- X-TIMESTAMP: `unix_timestamp`

**Response:**
```json
{
  "total": 100,
  "byStatus": {
    "UNLINKED": 10,
    "LINKED": 20,
    "MINTED": 50,
    "WITHDRAWN": 15,
    "BURNED": 5
  },
  "byBlockchain": {
    "ETH": 40,
    "MATIC": 30,
    "BASE": 20
  }
}
```

---

## Custody Status Lifecycle

```
UNLINKED → LINKED → MINTED → WITHDRAWN/BURNED
```

### Status Definitions

| Status | Description |
|--------|-------------|
| UNLINKED | Asset exists but not in custody |
| LINKED | Asset linked to custody, awaiting mint |
| MINTED | Token minted and in custody vault |
| WITHDRAWN | Token withdrawn to external wallet |
| BURNED | Token burned, asset redeemed |

---

## Custody Record Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique custody record ID |
| assetId | String | External asset identifier (immutable) |
| status | Enum | Current custody status |
| blockchain | String | Blockchain network (ETH, MATIC, etc.) |
| tokenStandard | String | Token standard (ERC721, ERC1155) |
| tokenAddress | String | Smart contract address |
| tokenId | String | Token ID on blockchain |
| quantity | String | Token quantity (decimal string) |
| vaultWalletId | UUID | Reference to vault wallet |
| linkedAt | DateTime | When asset was linked |
| mintedAt | DateTime | When token was minted |
| withdrawnAt | DateTime | When token was withdrawn |
| burnedAt | DateTime | When token was burned |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

---

## Security & Audit

- All custody operations are logged to audit trail
- Custody records are immutable (no deletion)
- Status transitions are validated
- Maker-checker required for sensitive operations

---

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Asset ID is required",
    "statusCode": 400,
    "details": {
      "field": "assetId",
      "message": "Required field"
    }
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Custody record not found",
    "statusCode": 404
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "Asset already linked to custody",
    "statusCode": 409
  }
}
```
