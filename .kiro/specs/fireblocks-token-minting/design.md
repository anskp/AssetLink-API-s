# Design Document

## Overview

This design document describes the architecture and implementation approach for integrating Fireblocks custody with AssetLink's token minting and marketplace infrastructure. The system provides secure, approval-gated tokenization of real-world assets with real-time execution monitoring and off-chain marketplace trading.

The design follows a custody-first approach where:
- All tokens remain in Fireblocks MPC custody
- Ownership is tracked off-chain in a ledger database
- Minting requires maker-checker approval
- Real-time status updates are provided via polling and audit logs
- Marketplace operations execute instantly without on-chain transactions

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend UI                          │
│  (Issuer Dashboard, Checker Dashboard, Marketplace UI)     │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│         (Authentication, Authorization, Validation)         │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Vault      │ │  Operation   │ │ Marketplace  │
│   Service    │ │   Service    │ │   Service    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       │         ┌──────┴────────┐       │
       │         ▼               ▼       │
       │   ┌──────────┐    ┌──────────┐ │
       │   │ Custody  │    │  Audit   │ │
       │   │ Service  │    │ Service  │ │
       │   └──────────┘    └──────────┘ │
       │                                 │
       └─────────────┬───────────────────┘
                     ▼
         ┌───────────────────────┐
         │  Fireblocks SDK       │
         │  (MPC Custody Layer)  │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │   Blockchain Layer    │
         │  (ETH, MATIC, etc.)   │
         └───────────────────────┘
```

### Component Responsibilities

**Vault Service**
- Create and manage Fireblocks vaults
- Generate blockchain-specific wallets
- Query vault balances and metadata
- Store vault/wallet data in database

**Operation Service**
- Manage operation lifecycle (PENDING → APPROVED → EXECUTED)
- Enforce maker-checker segregation
- Execute Fireblocks API calls after approval
- Poll Fireblocks for status updates
- Update custody records on completion

**Marketplace Service**
- Create and manage listings
- Process bids and offers
- Execute off-chain ownership transfers
- Handle listing expiry and cancellation

**Custody Service**
- Link assets to custody records
- Track custody status transitions
- Store token metadata
- Query ownership state

**Audit Service**
- Log all system events
- Provide immutable audit trail
- Support compliance reporting

## Components and Interfaces

### Vault Service API

```javascript
// POST /v1/vaults
createVault(vaultName, blockchains[])
  → { vaultId, fireblocksVaultId, wallets[] }

// GET /v1/vaults/:vaultId
getVaultDetails(vaultId)
  → { vaultId, fireblocksVaultId, wallets[], balances[] }

// GET /v1/vaults/:vaultId/wallets
listWallets(vaultId)
  → { wallets: [{ blockchain, address, balance }] }
```

### Token Minting API

```javascript
// POST /v1/operations/mint
initiateMint({
  assetId,
  tokenSymbol,
  tokenName,
  totalSupply,
  decimals,
  blockchainId,
  vaultId
})
  → { operationId, status: 'PENDING_CHECKER' }

// POST /v1/operations/:operationId/approve
approveMintOperation(operationId, checkerId)
  → { operationId, status: 'APPROVED', fireblocksTaskId }

// POST /v1/operations/:operationId/reject
rejectMintOperation(operationId, checkerId, reason)
  → { operationId, status: 'REJECTED' }

// GET /v1/operations/:operationId
getOperationStatus(operationId)
  → { operation, auditLogs[], fireblocksStatus }
```

### Marketplace API

```javascript
// POST /v1/marketplace/listings
createListing({
  assetId,
  price,
  currency,
  expiryDate
})
  → { listingId, status: 'ACTIVE' }

// POST /v1/marketplace/listings/:listingId/bids
placeBid(listingId, { amount, buyerId })
  → { bidId, status: 'PENDING' }

// POST /v1/marketplace/bids/:bidId/accept
acceptBid(bidId, sellerId)
  → { bidId, status: 'ACCEPTED', ownershipTransferred: true }

// GET /v1/marketplace/listings
listActiveListings(filters)
  → { listings: [{ listingId, asset, price, bids[] }] }
```

### Fireblocks Client Interface

```javascript
// Vault Management
createVault(name) → { id, name }
createWallet(vaultId, blockchain) → { address, blockchain }

// Token Operations
issueToken(vaultId, {
  name,
  symbol,
  decimals,
  totalSupply,
  blockchainId
}) → { tokenLinkId, status }

// Status Monitoring
getTokenizationStatus(tokenLinkId)
  → { status, txHash, contractAddress }

getTransactionStatus(txId)
  → { status, txHash, blockHeight }
```

## Data Models

### VaultWallet

```javascript
{
  id: UUID,
  fireblocksId: String,        // Fireblocks vault ID
  blockchain: String,           // ETH, MATIC, etc.
  address: String,              // Wallet address
  vaultType: String,            // CUSTODY, SETTLEMENT
  isActive: Boolean,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### CustodyRecord

```javascript
{
  id: UUID,
  assetId: String (unique),
  status: Enum,                 // UNLINKED, LINKED, MINTED, WITHDRAWN, BURNED
  
  // Token metadata
  blockchain: String,
  tokenStandard: String,        // ERC721, ERC1155
  tokenAddress: String,
  tokenId: String,
  quantity: String,
  
  // Vault reference
  vaultWalletId: UUID,
  
  // Timestamps
  linkedAt: DateTime,
  mintedAt: DateTime,
  withdrawnAt: DateTime,
  burnedAt: DateTime,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### CustodyOperation

```javascript
{
  id: UUID,
  operationType: Enum,          // MINT, TRANSFER, BURN
  status: Enum,                 // PENDING_CHECKER, APPROVED, EXECUTED, REJECTED, FAILED
  
  custodyRecordId: UUID,
  vaultWalletId: UUID,
  
  payload: JSON,                // Operation-specific parameters
  
  // Approval tracking
  initiatedBy: String,          // Maker user ID
  approvedBy: String,           // Checker user ID
  rejectedBy: String,
  rejectionReason: String,
  
  // Execution tracking
  fireblocksTaskId: String,
  txHash: String,
  executedAt: DateTime,
  failureReason: String,
  
  idempotencyKey: String,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Listing

```javascript
{
  id: UUID,
  assetId: String,
  custodyRecordId: UUID,
  
  sellerId: String,
  price: String,                // Decimal string
  currency: String,             // USD, ETH, etc.
  
  status: Enum,                 // ACTIVE, SOLD, CANCELLED, EXPIRED
  
  expiryDate: DateTime,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Bid

```javascript
{
  id: UUID,
  listingId: UUID,
  buyerId: String,
  
  amount: String,               // Decimal string
  status: Enum,                 // PENDING, ACCEPTED, REJECTED
  
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### AuditLog

```javascript
{
  id: UUID,
  custodyRecordId: UUID,
  operationId: UUID,
  
  eventType: String,            // OPERATION_CREATED, TOKEN_MINTED, etc.
  actor: String,                // User ID or SYSTEM
  metadata: JSON,               // Event-specific data
  
  ipAddress: String,
  userAgent: String,
  timestamp: DateTime
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified and consolidated:
- Properties 3.1 and 3.5 both test maker-checker segregation → Combined into Property 3
- Properties 1.3, 5.1, and 5.2 all test vault data persistence → Combined into Property 1
- Properties 4.5 and 5.4 both test operation completion data → Combined into Property 11
- Properties 2.5 and 7.1 both test operation creation audit logs → Combined into Property 5
- Properties 9.4 and 10.3 both test ownership transfer → Combined into Property 20

### Vault Management Properties

**Property 1: Vault creation persistence**
*For any* vault creation request, the system should store a VaultWallet record containing the Fireblocks vault ID, all generated wallet addresses, and their corresponding blockchain identifiers.
**Validates: Requirements 1.1, 1.3, 5.1, 5.2**

**Property 2: Wallet generation completeness**
*For any* created vault, the system should generate wallets for exactly the set of supported blockchains configured in the system.
**Validates: Requirements 1.2**

**Property 3: Vault query round-trip**
*For any* vault created in the system, querying that vault by ID should return all stored metadata including Fireblocks vault ID, wallet addresses, and blockchain networks.
**Validates: Requirements 1.5**

**Property 4: Vault creation error handling**
*For any* vault creation request that fails at the Fireblocks layer, the system should return an error response and create an audit log entry with the failure details.
**Validates: Requirements 1.4**

### Token Minting Properties

**Property 5: Mint request validation**
*For any* mint request, if any of the required parameters (assetId, tokenSymbol, tokenName, totalSupply, decimals, blockchainId) are missing, the system should reject the request with a validation error.
**Validates: Requirements 2.1**

**Property 6: Asset status precondition**
*For any* mint request, if the referenced asset does not exist or is not in LINKED status, the system should reject the request.
**Validates: Requirements 2.2**

**Property 7: Concurrent operation prevention**
*For any* asset with a pending operation, attempting to create another operation for that asset should be rejected.
**Validates: Requirements 2.3**

**Property 8: Operation creation persistence**
*For any* valid mint request, the system should create a CustodyOperation record in PENDING_CHECKER status containing all payload parameters and create an audit log with event type OPERATION_CREATED.
**Validates: Requirements 2.4, 2.5, 7.1**

### Maker-Checker Properties

**Property 9: Maker-checker segregation**
*For any* operation approval attempt, if the checker user ID equals the maker user ID, the system should reject the request with a forbidden error.
**Validates: Requirements 3.1, 3.5**

**Property 10: Approval state transition**
*For any* operation in PENDING_CHECKER status, when approved by a different user, the operation status should transition to APPROVED and the approvedBy field should be set to the checker's user ID.
**Validates: Requirements 3.2**

**Property 11: Approval triggers execution**
*For any* approved mint operation, the system should immediately call the Fireblocks tokenization API and return a Fireblocks task ID in the response.
**Validates: Requirements 3.3, 4.1**

**Property 12: Rejection state transition**
*For any* operation in PENDING_CHECKER status, when rejected, the operation status should transition to REJECTED and the rejection reason should be stored.
**Validates: Requirements 3.4**

### Monitoring and Audit Properties

**Property 13: Status polling behavior**
*For any* operation with a Fireblocks task ID, the system should poll the Fireblocks API for status updates at regular intervals until a terminal state is reached.
**Validates: Requirements 4.2**

**Property 14: Status change audit trail**
*For any* Fireblocks status change detected during monitoring, the system should create an audit log entry with the new status and timestamp.
**Validates: Requirements 4.3**

**Property 15: Audit log ordering**
*For any* operation, when querying audit logs, the system should return them in chronological order by timestamp.
**Validates: Requirements 4.4**

**Property 16: Completion data persistence**
*For any* mint operation that reaches COMPLETED status in Fireblocks, the system should update the CustodyRecord with the token address and transaction hash, and update the CustodyOperation with the transaction hash.
**Validates: Requirements 4.5, 5.4**

**Property 17: Token metadata completeness**
*For any* successfully minted token, the CustodyRecord should contain all required fields: blockchain, tokenStandard, tokenAddress, tokenId, and quantity.
**Validates: Requirements 5.3**

**Property 18: Custody record query round-trip**
*For any* minted token, querying the custody record should return all stored token metadata including blockchain identifiers.
**Validates: Requirements 5.5**

### Error Handling Properties

**Property 19: API failure handling**
*For any* Fireblocks API call that fails, the system should update the operation status to FAILED, log the error details in an audit log, and store the failure reason in the operation record.
**Validates: Requirements 6.2**

**Property 20: Retry behavior**
*For any* Fireblocks API call that times out, the system should retry the request exactly 3 times before marking the operation as FAILED.
**Validates: Requirements 6.3**

**Property 21: Error message transformation**
*For any* Fireblocks validation error, the system should return a user-friendly error message that does not expose internal implementation details.
**Validates: Requirements 6.4**

**Property 22: Monitoring failure detection**
*For any* transaction that reaches a failed state (FAILED, REJECTED, CANCELLED) in Fireblocks, the system should update the custody record status and create an audit log with event type OPERATION_FAILED.
**Validates: Requirements 6.5**

### Audit Trail Properties

**Property 23: Approval audit completeness**
*For any* approved operation, the system should create an audit log with event type OPERATION_APPROVED containing the checker's user ID.
**Validates: Requirements 7.2**

**Property 24: Execution audit completeness**
*For any* operation submitted to Fireblocks, the system should create an audit log with event type ON_CHAIN_SUBMISSION containing the Fireblocks task ID.
**Validates: Requirements 7.3**

**Property 25: Completion audit completeness**
*For any* successfully completed mint operation, the system should create an audit log with event type TOKEN_MINTED containing the transaction hash.
**Validates: Requirements 7.4**

**Property 26: Failure audit completeness**
*For any* failed operation, the system should create an audit log with event type OPERATION_FAILED containing error details.
**Validates: Requirements 7.5**

### Marketplace Listing Properties

**Property 27: Listing creation validation**
*For any* listing creation request, if any required parameters (assetId, price, currency, expiryDate) are missing, the system should reject the request with a validation error.
**Validates: Requirements 8.1**

**Property 28: Listing ownership verification**
*For any* listing creation request, if the user does not own the token in the off-chain ownership ledger, the system should reject the request.
**Validates: Requirements 8.2**

**Property 29: Listing creation persistence**
*For any* valid listing creation request, the system should create a Listing record with status ACTIVE and the seller's user ID.
**Validates: Requirements 8.3**

**Property 30: Listing expiry transition**
*For any* listing with an expiryDate in the past, the system should transition the listing status to EXPIRED.
**Validates: Requirements 8.4**

**Property 31: Listing cancellation authorization**
*For any* listing cancellation request, if the requester is not the original seller, the system should reject the request; otherwise, the listing status should transition to CANCELLED.
**Validates: Requirements 8.5**

### Marketplace Bidding Properties

**Property 32: Bid listing status validation**
*For any* bid placement request, if the listing is not in ACTIVE status, the system should reject the request.
**Validates: Requirements 9.1**

**Property 33: Bid balance validation**
*For any* bid placement request, if the buyer's account balance is less than the bid amount, the system should reject the request.
**Validates: Requirements 9.2**

**Property 34: Bid creation persistence**
*For any* valid bid placement request, the system should create a Bid record containing the buyer ID, listing ID, bid amount, and timestamp.
**Validates: Requirements 9.3**

**Property 35: Bid acceptance ownership transfer**
*For any* accepted bid, the system should transfer ownership of the token from the seller to the buyer in the off-chain ownership ledger atomically.
**Validates: Requirements 9.4, 10.3**

**Property 36: Bid acceptance listing update**
*For any* accepted bid, the system should update the listing status to SOLD and record the final sale price.
**Validates: Requirements 9.5**

**Property 37: Bid acceptance authorization**
*For any* bid acceptance request, if the requester does not own the listing, the system should reject the request.
**Validates: Requirements 10.1**

**Property 38: Bid acceptance validation**
*For any* bid acceptance request, if the bid is not valid or the buyer has insufficient funds, the system should reject the request.
**Validates: Requirements 10.2**

**Property 39: Bid acceptance payment settlement**
*For any* accepted bid, the system should update the buyer's balance (decrease) and seller's balance (increase) by the bid amount atomically.
**Validates: Requirements 10.4**

**Property 40: Bid rejection state transition**
*For any* rejected bid, the system should update the bid status to REJECTED and release any reserved funds.
**Validates: Requirements 10.5**

### Marketplace Query Properties

**Property 41: Active listings filter**
*For any* listing query request without filters, the system should return only listings with status ACTIVE.
**Validates: Requirements 11.1**

**Property 42: Listing filter application**
*For any* listing query with filters (assetType, priceRange, blockchain), the system should return only listings that match all applied filters.
**Validates: Requirements 11.2**

**Property 43: Listing sort application**
*For any* listing query with a sort parameter (price, createdAt, expiryDate), the system should return listings ordered by that field.
**Validates: Requirements 11.3**

**Property 44: Listing detail completeness**
*For any* listing detail query, the system should return complete asset metadata including images, description, and verification status.
**Validates: Requirements 11.4**

**Property 45: Listing bid statistics**
*For any* listing detail query, the system should return the current bid count and highest bid amount.
**Validates: Requirements 11.5**

## Error Handling

### Fireblocks Integration Errors

**Configuration Errors**
- Missing API credentials → Return 500 with message "Fireblocks configuration missing"
- Invalid private key format → Return 500 with message "Invalid Fireblocks credentials"

**API Errors**
- Network timeout → Retry up to 3 times, then fail with "Fireblocks API timeout"
- Rate limiting → Exponential backoff, then fail with "Fireblocks rate limit exceeded"
- Validation errors → Parse and return user-friendly message

**Transaction Errors**
- Insufficient gas → Fail operation with "Insufficient gas for transaction"
- Transaction rejected → Fail operation with "Transaction rejected by network"
- Transaction failed → Update custody status and notify

### Validation Errors

**Input Validation**
- Missing required fields → Return 400 with field-specific error messages
- Invalid data types → Return 400 with type mismatch details
- Invalid enum values → Return 400 with list of valid values

**Business Logic Validation**
- Asset not found → Return 404 with "Asset not found"
- Asset not in correct status → Return 400 with "Asset must be in LINKED status"
- Pending operations exist → Return 409 with "Asset has pending operations"
- Maker-checker violation → Return 403 with "Cannot approve own operation"

### Database Errors

**Connection Errors**
- Connection timeout → Retry with exponential backoff
- Connection lost → Attempt reconnection, fail after 3 attempts

**Constraint Violations**
- Unique constraint → Return 409 with "Resource already exists"
- Foreign key violation → Return 400 with "Referenced resource not found"

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

**Vault Service Tests**
- Test vault creation with valid parameters
- Test vault creation with missing Fireblocks credentials
- Test wallet generation for each supported blockchain
- Test vault query with non-existent vault ID

**Operation Service Tests**
- Test operation creation with valid payload
- Test maker-checker segregation enforcement
- Test operation approval flow
- Test operation rejection flow
- Test concurrent operation prevention

**Marketplace Service Tests**
- Test listing creation with valid ownership
- Test listing creation without ownership
- Test bid placement with sufficient balance
- Test bid placement with insufficient balance
- Test bid acceptance and ownership transfer

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property testing library).

**Configuration**
- Each property test will run a minimum of 100 iterations
- Tests will use custom generators for domain objects
- Each test will be tagged with the format: `**Feature: fireblocks-token-minting, Property {number}: {property_text}**`

**Test Organization**
- Property tests will be co-located with unit tests in `.test.js` files
- Each correctness property will be implemented by a single property-based test
- Tests will use realistic data generators that respect domain constraints

**Example Property Test Structure**
```javascript
// Feature: fireblocks-token-minting, Property 9: Maker-checker segregation
test('maker cannot approve their own operation', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        assetId: fc.string(),
        payload: fc.object()
      }),
      async ({ userId, assetId, payload }) => {
        // Create operation as maker
        const operation = await operationService.initiateOperation(
          { custodyRecordId: assetId, operationType: 'MINT', payload },
          userId
        );
        
        // Attempt to approve as same user
        await expect(
          operationService.approveOperation(operation.id, userId)
        ).rejects.toThrow('Maker cannot approve their own operation');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify end-to-end flows:

**Minting Flow Integration Test**
1. Create vault
2. Link asset
3. Initiate mint operation (maker)
4. Approve mint operation (checker)
5. Monitor Fireblocks execution
6. Verify custody record updated
7. Verify audit trail complete

**Marketplace Flow Integration Test**
1. Mint token
2. Create listing
3. Place bid
4. Accept bid
5. Verify ownership transferred
6. Verify balances updated

### Fireblocks Sandbox Testing

All Fireblocks integration will be tested against Fireblocks Sandbox environment:
- Use test API credentials
- Use testnet blockchains (ETH_TEST5, MATIC_MUMBAI)
- Verify webhook handling
- Test failure scenarios

## Implementation Notes

### Fireblocks SDK Integration

The system will use the official Fireblocks SDK for Node.js:

```javascript
import { FireblocksSDK } from 'fireblocks-sdk';

const fireblocks = new FireblocksSDK(
  process.env.FIREBLOCKS_API_KEY,
  process.env.FIREBLOCKS_SECRET_KEY
);
```

### Status Monitoring Implementation

Status monitoring will use a polling approach with exponential backoff:

```javascript
const monitorExecution = async (operationId, taskId, type) => {
  let attempts = 0;
  const maxAttempts = 30;
  const delay = 10000; // 10 seconds
  
  const poll = async () => {
    const status = await fireblocks.getTokenizationStatus(taskId);
    
    if (status === 'COMPLETED') {
      await finalizeOperation(operationId, status);
      return;
    }
    
    if (['FAILED', 'REJECTED'].includes(status)) {
      await failOperation(operationId, status);
      return;
    }
    
    if (attempts < maxAttempts) {
      attempts++;
      setTimeout(poll, delay);
    }
  };
  
  setTimeout(poll, delay);
};
```

### Database Transaction Management

All operations that modify multiple tables will use database transactions:

```javascript
const acceptBid = async (bidId, sellerId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify ownership
    // 2. Transfer ownership
    // 3. Update balances
    // 4. Update listing status
    // 5. Update bid status
    // 6. Create audit logs
  });
};
```

### Real-Time UI Updates

The UI will poll the operation status endpoint to display real-time logs:

```javascript
// Frontend polling implementation
const pollOperationStatus = async (operationId) => {
  const interval = setInterval(async () => {
    const { operation, auditLogs } = await fetch(
      `/v1/operations/${operationId}`
    ).then(r => r.json());
    
    updateUI(operation, auditLogs);
    
    if (['EXECUTED', 'FAILED', 'REJECTED'].includes(operation.status)) {
      clearInterval(interval);
    }
  }, 5000); // Poll every 5 seconds
};
```

### Security Considerations

**API Key Management**
- Store Fireblocks API keys in environment variables
- Never commit keys to version control
- Rotate keys regularly

**Request Validation**
- Validate all inputs against schemas
- Sanitize user inputs
- Use parameterized queries

**Authorization**
- Verify user permissions before operations
- Enforce maker-checker at API layer
- Log all authorization failures

**Audit Trail**
- Log all sensitive operations
- Include IP address and user agent
- Make audit logs immutable
