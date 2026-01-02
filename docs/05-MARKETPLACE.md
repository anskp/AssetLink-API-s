# Marketplace Module

## Overview
Off-chain marketplace for trading tokenized assets without blockchain transactions.

## Endpoints

### Create Listing
```
POST /v1/marketplace/listings
```

**Request Body:**
```json
{
  "assetId": "ROLEX-2025-001",
  "price": "50000.00",
  "currency": "USD",
  "expiryDate": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "assetId": "ROLEX-2025-001",
    "sellerId": "uuid",
    "price": "50000.00",
    "currency": "USD",
    "status": "ACTIVE",
    "expiryDate": "2024-12-31T23:59:59Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### List Active Listings
```
GET /v1/marketplace/listings
```

**Query Parameters:**
- `assetType`: Filter by asset type
- `priceMin`: Minimum price
- `priceMax`: Maximum price
- `blockchain`: Filter by blockchain
- `sortBy`: price, createdAt
- `sortOrder`: asc, desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "assetId": "ROLEX-2025-001",
      "price": "50000.00",
      "currency": "USD",
      "status": "ACTIVE",
      "seller": {
        "id": "uuid",
        "email": "seller@example.com"
      }
    }
  ]
}
```

---

### Get Listing Details
```
GET /v1/marketplace/listings/:listingId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "assetId": "ROLEX-2025-001",
    "price": "50000.00",
    "currency": "USD",
    "status": "ACTIVE",
    "seller": {...},
    "asset": {...},
    "bids": [...]
  }
}
```

---

### Cancel Listing
```
PUT /v1/marketplace/listings/:listingId/cancel
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED"
  }
}
```

---

### Place Bid
```
POST /v1/marketplace/listings/:listingId/bids
```

**Request Body:**
```json
{
  "amount": "48000.00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "listingId": "uuid",
    "buyerId": "uuid",
    "amount": "48000.00",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### Accept Bid
```
POST /v1/marketplace/bids/:bidId/accept
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bid": {
      "id": "uuid",
      "status": "ACCEPTED"
    },
    "ownership": {
      "assetId": "ROLEX-2025-001",
      "newOwnerId": "buyer_uuid",
      "transferredAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### Reject Bid
```
POST /v1/marketplace/bids/:bidId/reject
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "REJECTED"
  }
}
```

---

### Get Listing Bids
```
GET /v1/marketplace/listings/:listingId/bids
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": "48000.00",
      "status": "PENDING",
      "buyer": {
        "id": "uuid",
        "email": "buyer@example.com"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Get User Portfolio
```
GET /v1/marketplace/portfolio/:userId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "assetId": "ROLEX-2025-001",
      "custodyRecordId": "uuid",
      "quantity": "1",
      "acquiredAt": "2024-01-01T00:00:00Z",
      "asset": {
        "status": "MINTED",
        "blockchain": "ETH",
        "tokenAddress": "0x...",
        "assetMetadata": {...}
      }
    }
  ]
}
```

---

## Listing Status

| Status | Description |
|--------|-------------|
| ACTIVE | Available for trading |
| SOLD | Successfully sold |
| CANCELLED | Cancelled by seller |
| EXPIRED | Expired (past expiryDate) |

---

## Bid Status

| Status | Description |
|--------|-------------|
| PENDING | Awaiting seller decision |
| ACCEPTED | Accepted, ownership transferred |
| REJECTED | Rejected by seller |

---

## Off-Chain Trading Benefits

- ✅ Instant settlement
- ✅ Zero gas fees
- ✅ No blockchain congestion
- ✅ Scalable to millions of trades
- ✅ Custodian holds tokens (secure)
- ✅ Ownership tracked in database
