# Implementation Plan

- [x] 1. Set up Fireblocks client and vault management infrastructure







  - Create Fireblocks SDK client wrapper with configuration
  - Implement vault creation with Fireblocks API
  - Implement wallet generation for supported blockchains
  - Store vault and wallet metadata in VaultWallet table
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [ ]* 1.1 Write property test for vault creation persistence
  - **Property 1: Vault creation persistence**
  - **Validates: Requirements 1.1, 1.3, 5.1, 5.2**

- [ ]* 1.2 Write property test for wallet generation completeness
  - **Property 2: Wallet generation completeness**
  - **Validates: Requirements 1.2**

- [x] 2. Implement vault query and error handling






  - Create GET /v1/vaults/:vaultId endpoint
  - Implement vault details retrieval with wallets
  - Add error handling for Fireblocks API failures
  - Log vault creation errors to audit system
  - _Requirements: 1.4, 1.5_

- [ ]* 2.1 Write property test for vault query round-trip
  - **Property 3: Vault query round-trip**
  - **Validates: Requirements 1.5**

- [ ]* 2.2 Write property test for vault creation error handling
  - **Property 4: Vault creation error handling**
  - **Validates: Requirements 1.4**


- [x] 3. Implement token minting request validation and creation






  - Create POST /v1/operations/mint endpoint
  - Validate required parameters (assetId, tokenSymbol, tokenName, totalSupply, decimals, blockchainId)
  - Validate asset exists and is in LINKED status
  - Check for existing pending operations on asset
  - Create CustodyOperation record in PENDING_CHECKER status
  - Create audit log for OPERATION_CREATED event
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3.1 Write property test for mint request validation
  - **Property 5: Mint request validation**
  - **Validates: Requirements 2.1**

- [ ]* 3.2 Write property test for asset status precondition
  - **Property 6: Asset status precondition**
  - **Validates: Requirements 2.2**

- [ ]* 3.3 Write property test for concurrent operation prevention
  - **Property 7: Concurrent operation prevention**
  - **Validates: Requirements 2.3**

- [ ]* 3.4 Write property test for operation creation persistence
  - **Property 8: Operation creation persistence**
  - **Validates: Requirements 2.4, 2.5**




- [x] 4. Implement maker-checker approval workflow





  - Create POST /v1/operations/:operationId/approve endpoint
  - Verify checker is not the same user as maker
  - Transition operation status from PENDING_CHECKER to APPROVED
  - Store approvedBy field with checker user ID
  - Create audit log for OPERATION_APPROVED event
  - _Requirements: 3.1, 3.2, 3.5_

- [ ]* 4.1 Write property test for maker-checker segregation
  - **Property 9: Maker-checker segregation**
  - **Validates: Requirements 3.1, 3.5**

- [ ]* 4.2 Write property test for approval state transition
  - **Property 10: Approval state transition**
  - **Validates: Requirements 3.2**

- [x] 5. Implement operation rejection workflow

  - Create POST /v1/operations/:operationId/reject endpoint
  - Transition operation to REJECTED status
  - Store rejection reason
  - Create audit log for OPERATION_REJECTED event
  - _Requirements: 3.4_

- [ ]* 5.1 Write property test for rejection state transition
  - **Property 12: Rejection state transition**
  - **Validates: Requirements 3.4**

- [x] 6. Implement Fireblocks token minting execution

  - Call Fireblocks issueToken API after approval
  - Return Fireblocks task ID immediately to UI
  - Store fireblocksTaskId in CustodyOperation record
  - Create audit log for ON_CHAIN_SUBMISSION event
  - Handle Fireblocks API errors and update operation to FAILED
  - _Requirements: 3.3, 4.1, 6.2, 7.3_

- [ ]* 6.1 Write property test for approval triggers execution
  - **Property 11: Approval triggers execution**
  - **Validates: Requirements 3.3, 4.1**

- [ ]* 6.2 Write property test for API failure handling
  - **Property 19: API failure handling**
  - **Validates: Requirements 6.2**

- [x] 7. Implement Fireblocks status monitoring with polling

  - Create background polling function for Fireblocks status
  - Poll at 10-second intervals for up to 30 attempts
  - Create audit logs for status transitions (ON_CHAIN_SUBMISSION, BLOCK_PROPAGATION, FINALIZING_SETTLEMENT)
  - Handle COMPLETED, FAILED, REJECTED, CANCELLED states
  - Update operation status based on Fireblocks response
  - _Requirements: 4.2, 4.3, 6.5_

- [ ]* 7.1 Write property test for status polling behavior
  - **Property 13: Status polling behavior**
  - **Validates: Requirements 4.2**

- [ ]* 7.2 Write property test for status change audit trail
  - **Property 14: Status change audit trail**
  - **Validates: Requirements 4.3**

- [ ]* 7.3 Write property test for monitoring failure detection
  - **Property 22: Monitoring failure detection**
  - **Validates: Requirements 6.5**

- [x] 8. Implement custody record updates on mint completion

  - Update CustodyRecord with blockchain, tokenStandard, tokenAddress, tokenId, quantity
  - Update CustodyRecord status to MINTED
  - Store transaction hash in CustodyOperation
  - Set mintedAt timestamp
  - Create audit log for TOKEN_MINTED event with transaction hash
  - _Requirements: 4.5, 5.3, 5.4, 7.4_

- [ ]* 8.1 Write property test for completion data persistence
  - **Property 16: Completion data persistence**
  - **Validates: Requirements 4.5, 5.4**

- [ ]* 8.2 Write property test for token metadata completeness
  - **Property 17: Token metadata completeness**
  - **Validates: Requirements 5.3**

- [ ]* 8.3 Write property test for completion audit completeness
  - **Property 25: Completion audit completeness**
  - **Validates: Requirements 7.4**

- [x] 9. Implement operation status query endpoint

  - Create GET /v1/operations/:operationId endpoint
  - Return operation details with all fields
  - Return audit logs in chronological order
  - Include Fireblocks status updates
  - _Requirements: 4.4, 5.5_

- [ ]* 9.1 Write property test for audit log ordering
  - **Property 15: Audit log ordering**
  - **Validates: Requirements 4.4**

- [ ]* 9.2 Write property test for custody record query round-trip
  - **Property 18: Custody record query round-trip**
  - **Validates: Requirements 5.5**

- [x] 10. Implement error handling and retry logic

  - Add retry logic for network timeouts (3 attempts)
  - Parse Fireblocks validation errors into user-friendly messages
  - Handle missing API credentials with clear error messages
  - Create audit logs for all failures with OPERATION_FAILED event
  - _Requirements: 6.1, 6.3, 6.4, 7.5_

- [ ]* 10.1 Write property test for retry behavior
  - **Property 20: Retry behavior**
  - **Validates: Requirements 6.3**

- [ ]* 10.2 Write property test for error message transformation
  - **Property 21: Error message transformation**
  - **Validates: Requirements 6.4**

- [ ]* 10.3 Write property test for failure audit completeness
  - **Property 26: Failure audit completeness**
  - **Validates: Requirements 7.5**

- [ ] 11. Checkpoint - Ensure all minting tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement marketplace listing creation


  - Create POST /v1/marketplace/listings endpoint
  - Validate required parameters (assetId, price, currency, expiryDate)
  - Verify user owns token in off-chain ownership ledger
  - Create Listing record with status ACTIVE and seller user ID
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 12.1 Write property test for listing creation validation
  - **Property 27: Listing creation validation**
  - **Validates: Requirements 8.1**

- [ ]* 12.2 Write property test for listing ownership verification
  - **Property 28: Listing ownership verification**
  - **Validates: Requirements 8.2**

- [ ]* 12.3 Write property test for listing creation persistence
  - **Property 29: Listing creation persistence**
  - **Validates: Requirements 8.3**

- [x] 13. Implement listing expiry and cancellation

  - Create background job to check listing expiry dates
  - Transition expired listings to EXPIRED status
  - Create PUT /v1/marketplace/listings/:listingId/cancel endpoint
  - Verify requester is original seller
  - Transition listing to CANCELLED status
  - _Requirements: 8.4, 8.5_

- [ ]* 13.1 Write property test for listing expiry transition
  - **Property 30: Listing expiry transition**
  - **Validates: Requirements 8.4**

- [ ]* 13.2 Write property test for listing cancellation authorization
  - **Property 31: Listing cancellation authorization**
  - **Validates: Requirements 8.5**

- [x] 14. Implement bid placement

  - Create POST /v1/marketplace/listings/:listingId/bids endpoint
  - Verify listing is in ACTIVE status
  - Verify buyer has sufficient balance
  - Create Bid record with buyer ID, listing ID, bid amount, and timestamp
  - _Requirements: 9.1, 9.2, 9.3_

- [ ]* 14.1 Write property test for bid listing status validation
  - **Property 32: Bid listing status validation**
  - **Validates: Requirements 9.1**

- [ ]* 14.2 Write property test for bid balance validation
  - **Property 33: Bid balance validation**
  - **Validates: Requirements 9.2**

- [ ]* 14.3 Write property test for bid creation persistence
  - **Property 34: Bid creation persistence**
  - **Validates: Requirements 9.3**

- [x] 15. Implement bid acceptance with off-chain ownership transfer

  - Create POST /v1/marketplace/bids/:bidId/accept endpoint
  - Verify seller owns the listing
  - Verify bid is valid and buyer has sufficient funds
  - Execute atomic transaction:
    - Transfer ownership in off-chain ledger from seller to buyer
    - Update buyer balance (decrease)
    - Update seller balance (increase)
    - Update listing status to SOLD
    - Record sale price
  - _Requirements: 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

- [ ]* 15.1 Write property test for bid acceptance authorization
  - **Property 37: Bid acceptance authorization**
  - **Validates: Requirements 10.1**

- [ ]* 15.2 Write property test for bid acceptance validation
  - **Property 38: Bid acceptance validation**
  - **Validates: Requirements 10.2**

- [ ]* 15.3 Write property test for bid acceptance ownership transfer
  - **Property 35: Bid acceptance ownership transfer**
  - **Validates: Requirements 9.4, 10.3**

- [ ]* 15.4 Write property test for bid acceptance listing update
  - **Property 36: Bid acceptance listing update**
  - **Validates: Requirements 9.5**

- [ ]* 15.5 Write property test for bid acceptance payment settlement
  - **Property 39: Bid acceptance payment settlement**
  - **Validates: Requirements 10.4**

- [x] 16. Implement bid rejection

  - Create POST /v1/marketplace/bids/:bidId/reject endpoint
  - Update bid status to REJECTED
  - Release any reserved funds
  - _Requirements: 10.5_

- [ ]* 16.1 Write property test for bid rejection state transition
  - **Property 40: Bid rejection state transition**
  - **Validates: Requirements 10.5**

- [x] 17. Implement marketplace listing queries

  - Create GET /v1/marketplace/listings endpoint
  - Return only ACTIVE listings by default
  - Support filtering by assetType, priceRange, blockchain
  - Support sorting by price, createdAt, expiryDate
  - Include complete asset metadata (images, description, verification status)
  - Include bid count and highest bid amount
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 17.1 Write property test for active listings filter
  - **Property 41: Active listings filter**
  - **Validates: Requirements 11.1**

- [ ]* 17.2 Write property test for listing filter application
  - **Property 42: Listing filter application**
  - **Validates: Requirements 11.2**

- [ ]* 17.3 Write property test for listing sort application
  - **Property 43: Listing sort application**
  - **Validates: Requirements 11.3**

- [ ]* 17.4 Write property test for listing detail completeness
  - **Property 44: Listing detail completeness**
  - **Validates: Requirements 11.4**

- [ ]* 17.5 Write property test for listing bid statistics
  - **Property 45: Listing bid statistics**
  - **Validates: Requirements 11.5**






- [x] 18. Implement audit trail completeness



  - Ensure OPERATION_APPROVED events include checker identity
  - Ensure all operation failures create OPERATION_FAILED audit logs
  - Verify audit logs are immutable (append-only)
  - _Requirements: 7.2, 7.5_

- [ ]* 18.1 Write property test for approval audit completeness
  - **Property 23: Approval audit completeness**
  - **Validates: Requirements 7.2**

- [ ]* 18.2 Write property test for execution audit completeness
  - **Property 24: Execution audit completeness**
  - **Validates: Requirements 7.3**

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
