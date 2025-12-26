# Sprint 2 - Core Data Model & Audit Infrastructure

**Status**: ✅ Complete  
**Duration**: Core Infrastructure Sprint  
**Goal**: Implement comprehensive audit logging and custody record management

---

## 📋 Overview

Sprint 2 establishes the audit foundation and custody record lifecycle management for AssetLink Custody. This sprint ensures full compliance through append-only audit trails and implements the core custody operations.

---

## 🎯 Objectives

1. ✅ Implement append-only audit logging
2. ✅ Create custody record management
3. ✅ Build audit trail APIs
4. ✅ Develop dashboard UI for visualization
5. ✅ Ensure full traceability of all actions

---

## 🗄️ Audit Infrastructure

### Audit Repository

**File**: `src/modules/audit/audit.repository.js`

```javascript
// Create audit log (append-only)
await createAuditLog({
  eventType: 'ASSET_LINKED',
  actor: 'user@example.com',
  metadata: { assetId: 'ROLEX-123' },
  custodyRecordId: 'uuid',
  ipAddress: '192.168.1.1'
});

// Query audit logs
await findByCustodyRecord(custodyRecordId);
await findByOperation(operationId);
await findByActor(actor);
await getRecentLogs(50);
```

**Key Features**:
- Append-only (no updates or deletes)
- Automatic timestamp
- Context enrichment (IP, user agent)
- Multiple query methods

---

### Audit Service

**File**: `src/modules/audit/audit.service.js`

**Event Types**:
- `ASSET_LINKED` - Asset registered in custody
- `TOKEN_MINTED` - Token created on-chain
- `TOKEN_TRANSFERRED` - Token moved to external wallet
- `TOKEN_BURNED` - Token destroyed
- `OPERATION_CREATED` - New operation initiated
- `OPERATION_APPROVED` - Checker approved
- `OPERATION_REJECTED` - Checker rejected
- `OPERATION_EXECUTED` - On-chain execution completed
- `OPERATION_FAILED` - Execution failed

**Usage Example**:
```javascript
import * as auditService from './modules/audit/audit.service.js';

// Log asset linking
await auditService.logAssetLinked(
  custodyRecordId,
  'ROLEX-2025-001',
  'admin@company.com',
  { ipAddress: req.ip, userAgent: req.get('user-agent') }
);

// Log token minting
await auditService.logTokenMinted(
  custodyRecordId,
  { blockchain: 'ETH', tokenId: '123', tokenAddress: '0x...' },
  'admin@company.com'
);
```

---

## 🏦 Custody Management

### Custody Repository

**File**: `src/modules/custody/custody.repository.js`

```javascript
// Create custody record
const record = await createCustodyRecord('ROLEX-2025-001');

// Find by asset ID
const record = await findByAssetId('ROLEX-2025-001');

// Update status
await updateStatus(id, 'MINTED', {
  blockchain: 'ETH',
  tokenAddress: '0x...',
  tokenId: '123'
});

// Get statistics
const stats = await getStatistics();
// { total: 100, linked: 20, minted: 70, withdrawn: 5, burned: 5 }
```

---

### Custody Service

**File**: `src/modules/custody/custody.service.js`

**State Machine**:
```
UNLINKED → LINKED → MINTED → WITHDRAWN
                           ↘ BURNED
```

**Valid Transitions**:
- `UNLINKED` → `LINKED`
- `LINKED` → `MINTED`
- `MINTED` → `WITHDRAWN` or `BURNED`

**Usage Example**:
```javascript
import * as custodyService from './modules/custody/custody.service.js';

// Link asset to custody
const record = await custodyService.linkAsset(
  'ROLEX-2025-001',
  'admin@company.com',
  { ipAddress: '192.168.1.1' }
);

// Get custody status
const status = await custodyService.getCustodyStatus('ROLEX-2025-001');

// Update status (with automatic audit logging)
await custodyService.updateCustodyStatus(
  recordId,
  'MINTED',
  { blockchain: 'ETH', tokenId: '123' },
  'admin@company.com'
);
```

---

## 📡 API Endpoints

### Custody Endpoints

#### Link Asset
```http
POST /v1/custody/link
Content-Type: application/json
X-API-KEY: <public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>

{
  "assetId": "ROLEX-2025-001"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "ROLEX-2025-001",
  "status": "LINKED",
  "linkedAt": "2025-12-26T14:00:00.000Z",
  "isActive": true,
  "hasToken": false,
  "daysInCustody": 0
}
```

---

#### Get Custody Status
```http
GET /v1/custody/ROLEX-2025-001
X-API-KEY: <public_key>
X-SIGNATURE: <hmac_signature>
X-TIMESTAMP: <unix_timestamp>
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "assetId": "ROLEX-2025-001",
  "status": "MINTED",
  "blockchain": "ETH",
  "tokenStandard": "ERC721",
  "tokenAddress": "0x1234...",
  "tokenId": "123",
  "linkedAt": "2025-12-26T14:00:00.000Z",
  "mintedAt": "2025-12-26T15:00:00.000Z",
  "isActive": true,
  "hasToken": true,
  "daysInCustody": 1
}
```

---

#### List Custody Records
```http
GET /v1/custody?status=MINTED&limit=50&offset=0
```

**Response** (200 OK):
```json
{
  "records": [
    {
      "id": "...",
      "assetId": "ROLEX-2025-001",
      "status": "MINTED",
      "blockchain": "ETH",
      "tokenId": "123"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

#### Get Statistics
```http
GET /v1/custody/stats
```

**Response** (200 OK):
```json
{
  "total": 100,
  "linked": 20,
  "minted": 70,
  "withdrawn": 5,
  "burned": 5
}
```

---

### Audit Endpoints

#### Get Recent Audit Logs
```http
GET /v1/audit/recent?limit=50
```

**Response** (200 OK):
```json
{
  "logs": [
    {
      "id": "...",
      "eventType": "ASSET_LINKED",
      "actor": "admin@company.com",
      "metadata": { "assetId": "ROLEX-2025-001" },
      "ipAddress": "192.168.1.1",
      "timestamp": "2025-12-26T14:00:00.000Z",
      "custodyRecord": {
        "assetId": "ROLEX-2025-001",
        "status": "LINKED"
      }
    }
  ],
  "total": 50
}
```

---

#### Get Custody Audit Trail
```http
GET /v1/audit/custody/:id
```

**Response**: Array of all events for that custody record

---

#### Get Events by Type
```http
GET /v1/audit/events/ASSET_LINKED?limit=100
```

**Response**: All asset linking events

---

## 🎨 Dashboard UI

### Access
Open browser to: **`http://localhost:3000/dashboard`**

### Pages

#### 1. Overview
- **Statistics Cards**: Total, Linked, Minted, Withdrawn counts
- **Recent Activity**: Live feed of latest audit events
- **Auto-refresh**: Updates when data changes

#### 2. Custody Records
- **Filterable Table**: Filter by status
- **Columns**: Asset ID, Status, Blockchain, Token ID, Linked Date
- **Actions**: View details button
- **Link Asset**: Modal to register new assets

#### 3. Audit Trail
- **Event Log**: Chronological list of all events
- **Event Details**: Type, actor, timestamp, IP
- **Color Coding**: Different colors for event types

#### 4. API Keys
- **Key Management**: List all API keys
- **Status**: Active/Revoked indicators
- **Permissions**: View key permissions
- **Actions**: Revoke keys

---

## 🔧 Configuration

### Update API Key in Dashboard

Edit `src/ui/app.js`:
```javascript
const API_KEY = 'ak_your_public_key_here';
const API_SECRET = 'sk_your_secret_key_here';
```

---

## 📁 File Structure

```
src/
├── modules/
│   ├── audit/
│   │   ├── audit.repository.js   # Database operations
│   │   └── audit.service.js      # Event logging
│   └── custody/
│       ├── custody.repository.js # Database operations
│       ├── custody.service.js    # Business logic
│       └── custody.controller.js # HTTP handlers
├── routes/
│   ├── custody.routes.js         # Custody endpoints
│   └── audit.routes.js           # Audit endpoints
└── ui/
    ├── index.html                # Dashboard UI
    ├── styles.css                # Styling
    └── app.js                    # JavaScript logic
```

---

## 🧪 Testing

### 1. Link an Asset
```bash
curl -X POST http://localhost:3000/v1/custody/link \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your_key" \
  -H "X-SIGNATURE: signature" \
  -H "X-TIMESTAMP: timestamp" \
  -d '{"assetId":"ROLEX-2025-001"}'
```

### 2. View in Dashboard
1. Open `http://localhost:3000/dashboard`
2. Navigate to "Custody Records"
3. See your linked asset

### 3. Check Audit Trail
1. Navigate to "Audit Trail"
2. See `ASSET_LINKED` event logged

---

## ✅ Deliverables

- ✅ Audit repository with 7 query methods
- ✅ Audit service with 11 event types
- ✅ Custody repository with CRUD operations
- ✅ Custody service with state machine
- ✅ 4 custody API endpoints
- ✅ 4 audit API endpoints
- ✅ Dashboard UI with 4 pages
- ✅ Static file serving configured

---

## 🎯 Next Sprint

**Sprint 3 - Asset Linking Service**
- Asset metadata storage
- Asset verification hooks
- Asset query APIs
- Enhanced asset detail views
- Document upload support
