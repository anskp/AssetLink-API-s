# Requirements Document

## Introduction

This document defines the requirements for implementing Fireblocks-integrated token minting with vault management for the AssetLink Custody system. The feature enables secure, approval-gated tokenization of real-world assets with full on-chain execution tracking and real-time status updates.

## Glossary

- **Fireblocks**: MPC-based institutional custody platform providing secure key management and transaction execution
- **Vault**: A logical container in Fireblocks that holds multiple blockchain wallets
- **Wallet**: A blockchain-specific address within a vault (e.g., ETH wallet, MATIC wallet)
- **Token Minting**: The process of creating new tokens on-chain representing custody of a real-world asset
- **Maker**: The user who initiates a minting operation
- **Checker**: The user who approves or rejects a minting operation (must be different from maker)
- **AssetLink Custody**: The custody system managing off-chain ownership and on-chain tokenization
- **Custody Record**: Database record linking a physical asset to its digital token representation

## Requirements

### Requirement 1

**User Story:** As an issuer, I want to create dedicated Fireblocks vaults for assets, so that each asset has proper custody infrastructure before tokenization.

#### Acceptance Criteria

1. WHEN an issuer requests vault creation THEN the system SHALL create a new vault in Fireblocks with a unique identifier
2. WHEN a vault is created THEN the system SHALL generate wallets for all supported blockchains within that vault
3. WHEN vault creation completes THEN the system SHALL store vault metadata including Fireblocks vault ID, wallet addresses, and blockchain identifiers in the database
4. WHEN vault creation fails THEN the system SHALL log the error and return a descriptive failure message
5. WHEN querying vault details THEN the system SHALL return complete vault information including all wallet addresses and their blockchain networks

### Requirement 2

**User Story:** As an issuer, I want to initiate token minting requests with specific parameters, so that I can tokenize assets with the correct token symbol, supply, and blockchain.

#### Acceptance Criteria

1. WHEN an issuer submits a mint request THEN the system SHALL require assetId, tokenSymbol, tokenName, totalSupply, decimals, and blockchainId as mandatory parameters
2. WHEN a mint request is submitted THEN the system SHALL validate that the asset exists and is in LINKED status
3. WHEN a mint request is submitted THEN the system SHALL validate that no pending operations exist for that asset
4. WHEN a mint request is created THEN the system SHALL store the operation in PENDING_CHECKER status with all payload parameters
5. WHEN a mint request is created THEN the system SHALL log an audit event with the initiator and timestamp

### Requirement 3

**User Story:** As a checker, I want to review and approve minting requests, so that I can ensure proper dual-control before on-chain execution.

#### Acceptance Criteria

1. WHEN a checker approves a mint operation THEN the system SHALL verify the checker is not the same user as the maker
2. WHEN a checker approves a mint operation THEN the system SHALL transition the operation status from PENDING_CHECKER to APPROVED
3. WHEN a mint operation is approved THEN the system SHALL immediately execute the Fireblocks tokenization API call
4. WHEN a checker rejects a mint operation THEN the system SHALL transition the operation to REJECTED status and store the rejection reason
5. WHEN a checker attempts to approve their own operation THEN the system SHALL reject the request with a forbidden error

### Requirement 4

**User Story:** As a checker, I want to see real-time Fireblocks execution logs in the UI, so that I can monitor the on-chain minting progress after approval.

#### Acceptance Criteria

1. WHEN a mint operation is approved THEN the system SHALL return the Fireblocks task ID immediately to the UI
2. WHEN Fireblocks execution is in progress THEN the system SHALL poll the Fireblocks API for status updates at regular intervals
3. WHEN Fireblocks status changes THEN the system SHALL create audit log entries for each significant state transition
4. WHEN the UI requests operation details THEN the system SHALL return all audit logs in chronological order including Fireblocks status updates
5. WHEN Fireblocks execution completes THEN the system SHALL update the custody record with the final token address and transaction hash

### Requirement 5

**User Story:** As the system, I want to track all vault, wallet, and token data in the database, so that custody state is always queryable and auditable.

#### Acceptance Criteria

1. WHEN a vault is created THEN the system SHALL store a VaultWallet record with Fireblocks vault ID, blockchain, and vault type
2. WHEN a wallet address is generated THEN the system SHALL store the address in the VaultWallet record
3. WHEN a token is minted THEN the system SHALL update the CustodyRecord with blockchain, tokenStandard, tokenAddress, tokenId, and quantity
4. WHEN a minting operation completes THEN the system SHALL store the Fireblocks task ID and transaction hash in the CustodyOperation record
5. WHEN querying custody records THEN the system SHALL return complete token metadata including all blockchain identifiers

### Requirement 6

**User Story:** As a developer, I want comprehensive error handling for Fireblocks integration, so that failures are gracefully handled and clearly communicated.

#### Acceptance Criteria

1. WHEN Fireblocks API credentials are missing THEN the system SHALL return a clear error message indicating configuration issues
2. WHEN Fireblocks API calls fail THEN the system SHALL log the error details and update the operation status to FAILED
3. WHEN network timeouts occur THEN the system SHALL retry the request up to 3 times before marking as failed
4. WHEN Fireblocks returns validation errors THEN the system SHALL parse and return user-friendly error messages
5. WHEN monitoring detects a failed transaction THEN the system SHALL update the custody record status and notify relevant parties

### Requirement 7

**User Story:** As a compliance officer, I want complete audit trails for all minting operations, so that I can trace every tokenization event to its approvers and execution details.

#### Acceptance Criteria

1. WHEN a mint operation is initiated THEN the system SHALL create an audit log with event type OPERATION_CREATED
2. WHEN a mint operation is approved THEN the system SHALL create an audit log with event type OPERATION_APPROVED including the checker identity
3. WHEN Fireblocks execution starts THEN the system SHALL create an audit log with event type ON_CHAIN_SUBMISSION
4. WHEN Fireblocks execution completes THEN the system SHALL create an audit log with event type TOKEN_MINTED including transaction hash
5. WHEN any operation fails THEN the system SHALL create an audit log with event type OPERATION_FAILED including error details

### Requirement 8

**User Story:** As a marketplace operator, I want to create and manage token listings, so that tokenized assets can be traded in a secondary market.

#### Acceptance Criteria

1. WHEN a token owner creates a listing THEN the system SHALL require assetId, price, currency, and expiryDate as mandatory parameters
2. WHEN a listing is created THEN the system SHALL verify the user owns the token in the off-chain ownership ledger
3. WHEN a listing is created THEN the system SHALL store the listing with status ACTIVE and the seller's user ID
4. WHEN a listing expires THEN the system SHALL automatically transition the listing status to EXPIRED
5. WHEN a listing is cancelled THEN the system SHALL verify the requester is the original seller and transition status to CANCELLED

### Requirement 9

**User Story:** As a buyer, I want to place bids on active listings, so that I can purchase tokenized assets at the listed price.

#### Acceptance Criteria

1. WHEN a buyer places a bid THEN the system SHALL verify the listing is in ACTIVE status
2. WHEN a buyer places a bid THEN the system SHALL verify the buyer has sufficient balance in their account
3. WHEN a bid is placed THEN the system SHALL create a bid record with buyer ID, listing ID, bid amount, and timestamp
4. WHEN a bid is accepted THEN the system SHALL execute an off-chain ownership transfer from seller to buyer
5. WHEN a bid is accepted THEN the system SHALL update the listing status to SOLD and record the sale price

### Requirement 10

**User Story:** As a seller, I want to accept or reject bids on my listings, so that I can control which buyers acquire my tokenized assets.

#### Acceptance Criteria

1. WHEN a seller accepts a bid THEN the system SHALL verify the seller owns the listing
2. WHEN a seller accepts a bid THEN the system SHALL verify the bid is still valid and the buyer has sufficient funds
3. WHEN a bid is accepted THEN the system SHALL transfer ownership in the off-chain ledger atomically
4. WHEN a bid is accepted THEN the system SHALL settle payment by updating buyer and seller account balances
5. WHEN a seller rejects a bid THEN the system SHALL update the bid status to REJECTED and release any reserved funds

### Requirement 11

**User Story:** As a marketplace user, I want to view all active listings with filtering and sorting, so that I can discover tokenized assets available for purchase.

#### Acceptance Criteria

1. WHEN a user requests listings THEN the system SHALL return all listings with status ACTIVE
2. WHEN a user applies filters THEN the system SHALL support filtering by assetType, priceRange, and blockchain
3. WHEN a user applies sorting THEN the system SHALL support sorting by price, createdAt, and expiryDate
4. WHEN a user views a listing THEN the system SHALL return complete asset metadata including images, description, and verification status
5. WHEN a user views a listing THEN the system SHALL return the current bid count and highest bid amount
