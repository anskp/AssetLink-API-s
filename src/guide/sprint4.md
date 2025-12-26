# Sprint 4 Guide: Operation Workflow & Maker-Checker Engine

## Overview
Sprint 4 implements the **Maker-Checker (Dual-Approval)** security model. This ensures that no single entity can initiate and execute a sensitive custody operation (like Minting or Burning) without independent verification.

## Core Concepts

### 1. Maker-Checker Segregation
- **Maker**: The entity that initiates an operation (e.g., Issuer).
- **Checker**: The entity that approves or rejects the operation (e.g., Custodian Admin).
- **Enforcement**: The system strictly prevents `initiatedBy === approvedBy`.

### 2. Operation Lifecycle
Operations follow a strict state machine:
1. `PENDING_CHECKER`: Initiated by Maker, awaiting approval.
2. `APPROVED`: Verified by Checker, ready for execution.
3. `EXECUTED`: Successfully processed on-chain/in-vault.
4. `REJECTED`: Declined by Checker with a reason.
5. `FAILED`: Execution attempted but failed.

## API Endpoints

### Operations
- `GET /v1/operations`: List operations with filters (`status`, `type`).
- `POST /v1/operations`: Initiate a new operation.
- `POST /v1/operations/:id/approve`: Approve a pending operation.
- `POST /v1/operations/:id/reject`: Reject a pending operation.

## Role-Based Testing
The dashboard includes a **Role Switcher** for rapid testing:

### Issuer (Maker)
- **Permissions**: `read`, `write`
- **Actions**: Link Assets, Initiate `MINT` operations.

### Checker (Admin)
- **Permissions**: `admin`
- **Actions**: View Approval Queue, `APPROVE` or `REJECT` operations.

### Investor
- **Permissions**: `read`
- **Actions**: Browse Marketplace, Initiate `BURN` (Redemption) operations.

## Security Configuration
All operation endpoints require HMAC authentication. Ensure your API keys have the appropriate scopes:
- `write`: Required to initiate operations.
- `admin`: Required to approve/reject operations.

## Integration Example
```javascript
// Initiate a Minting operation
const response = await fetch('/v1/operations', {
  method: 'POST',
  body: JSON.stringify({
    custodyRecordId: '...',
    operationType: 'MINT',
    payload: { blockchain: 'ETH' }
  }),
  headers: { 'X-API-KEY': 'MAKER_KEY', ... }
});
```
