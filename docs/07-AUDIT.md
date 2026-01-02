# Audit Module

## Overview
Immutable audit trail for all system operations and compliance.

## Endpoints

### Get Audit Logs
```
GET /v1/audit
```

**Query Parameters:**
- `eventType`: Filter by event type
- `custodyRecordId`: Filter by custody record
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `limit`: Records per page (default: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "eventType": "ASSET_LINKED",
      "actor": "user_id",
      "custodyRecordId": "uuid",
      "operationId": null,
      "metadata": {
        "assetId": "ROLEX-2025-001",
        "action": "link"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1000,
  "limit": 100,
  "offset": 0
}
```

---

### Get Audit Log by ID
```
GET /v1/audit/:id
```

**Response:**
```json
{
  "id": "uuid",
  "eventType": "TOKEN_MINTED",
  "actor": "user_id",
  "custodyRecordId": "uuid",
  "operationId": "uuid",
  "metadata": {
    "tokenAddress": "0x...",
    "tokenId": "1",
    "blockchain": "ETH"
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

### Get Audit Trail for Asset
```
GET /v1/audit/asset/:assetId
```

**Response:**
```json
{
  "assetId": "ROLEX-2025-001",
  "logs": [
    {
      "eventType": "ASSET_LINKED",
      "actor": "user_id",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "eventType": "TOKEN_MINTED",
      "actor": "user_id",
      "timestamp": "2024-01-01T01:00:00Z"
    }
  ]
}
```

---

## Event Types

### Asset Events
- `ASSET_LINKED` - Asset linked to custody
- `ASSET_METADATA_UPDATED` - Asset metadata changed

### Token Events
- `TOKEN_MINTED` - Token minted
- `TOKEN_BURNED` - Token burned
- `TOKEN_WITHDRAWN` - Token withdrawn

### Operation Events
- `OPERATION_INITIATED` - Operation created
- `OPERATION_APPROVED` - Operation approved
- `OPERATION_REJECTED` - Operation rejected
- `OPERATION_EXECUTED` - Operation executed
- `OPERATION_FAILED` - Operation failed

### Marketplace Events
- `LISTING_CREATED` - Listing created
- `LISTING_CANCELLED` - Listing cancelled
- `BID_PLACED` - Bid placed
- `BID_ACCEPTED` - Bid accepted
- `OWNERSHIP_TRANSFERRED` - Ownership changed

### User Events
- `USER_REGISTERED` - User registered
- `USER_LOGIN` - User logged in
- `API_KEY_GENERATED` - API key created
- `API_KEY_REVOKED` - API key revoked

---

## Audit Log Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique log ID |
| eventType | String | Type of event |
| actor | String | User/system that triggered event |
| custodyRecordId | UUID | Related custody record (optional) |
| operationId | UUID | Related operation (optional) |
| metadata | JSON | Event-specific data |
| ipAddress | String | IP address of actor |
| userAgent | String | User agent string |
| timestamp | DateTime | When event occurred (immutable) |

---

## Audit Trail Properties

- ✅ **Immutable** - No updates or deletes
- ✅ **Append-only** - Only inserts allowed
- ✅ **Timestamped** - Precise event timing
- ✅ **Traceable** - Full actor attribution
- ✅ **Searchable** - Indexed for queries
- ✅ **Compliant** - Meets regulatory requirements

---

## Compliance Features

- All sensitive operations are logged
- Logs include IP address and user agent
- Timestamps are immutable
- No log deletion (retention policy only)
- Audit logs are backed up separately
- Integrity verification available

---

## Best Practices

1. **Regular Review**: Monitor audit logs for suspicious activity
2. **Retention**: Keep logs for required compliance period
3. **Backup**: Separate backup of audit logs
4. **Alerting**: Set up alerts for critical events
5. **Analysis**: Use logs for security analysis
