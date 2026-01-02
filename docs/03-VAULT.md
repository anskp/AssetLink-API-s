# Vault Module

## Overview
Manages Fireblocks vaults and wallets for secure custody of tokenized assets.

## Endpoints

### Create Vault
```
POST /v1/vaults
```

**Request Body:**
```json
{
  "vaultName": "Main Custody Vault",
  "customerRefId": "tenant-001",
  "vaultType": "CUSTODY"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "id": "uuid",
      "fireblocksId": "0",
      "vaultType": "CUSTODY",
      "isActive": true
    },
    "wallets": [
      {
        "id": "uuid",
        "blockchain": "ETH",
        "address": "0x...",
        "fireblocksId": "0"
      }
    ]
  }
}
```

---

### Get Vault Details
```
GET /v1/vaults/:vaultId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vault": {
      "id": "uuid",
      "fireblocksId": "0",
      "vaultType": "CUSTODY",
      "isActive": true
    },
    "wallets": [
      {
        "blockchain": "ETH",
        "address": "0x...",
        "balance": "0"
      }
    ]
  }
}
```

---

### List Wallets
```
GET /v1/vaults/:vaultId/wallets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "blockchain": "ETH",
      "address": "0x...",
      "isActive": true
    }
  ]
}
```

---

### Get Wallet
```
GET /v1/vaults/:vaultId/wallets/:blockchain
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "blockchain": "ETH",
    "address": "0x...",
    "balance": "0",
    "isActive": true
  }
}
```

---

## Supported Blockchains

- ETH (Ethereum)
- MATIC (Polygon)
- BASE (Base)
- More coming soon...

---

## Vault Types

| Type | Description |
|------|-------------|
| CUSTODY | Main custody vault for tokenized assets |
| SETTLEMENT | Settlement vault for marketplace trades |

---

## Security Features

- ✅ Fireblocks MPC-CMP key management
- ✅ No private keys exposed
- ✅ Multi-signature support
- ✅ Policy-based transaction approval
- ✅ Real-time balance monitoring
