# Complete Tokenization Engine Guide - Fireblocks Integration

> **Project**: COPYm Platform Tokenization System  
> **Last Updated**: December 26, 2025  
> **Purpose**: Complete documentation of tokenization process using Fireblocks API for external projects

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Services](#core-services)
5. [Token Deployment Flow](#token-deployment-flow)
6. [Token Purchase & Transfer Flow](#token-purchase--transfer-flow)
7. [Fireblocks Integration](#fireblocks-integration)
8. [Configuration](#configuration)
9. [API Endpoints](#api-endpoints)
10. [Testing Scripts](#testing-scripts)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

---

## 🎯 Overview

This tokenization engine provides a complete solution for:
- **Token Creation**: Deploy ERC-20/721/1155 tokens on multiple EVM chains
- **Token Transfers**: Secure token transfers between vaults using Fireblocks
- **Ownership Tracking**: Database-backed ownership records with percentages
- **Verifiable Credentials**: Automatic VC generation for token ownership
- **Gas Management**: Centralized gas vault system for efficient fee handling
- **Multi-Network Support**: Ethereum, Polygon, BSC, Optimism, Arbitrum, Base, Avalanche

### Key Features
✅ Admin-approved minting workflow  
✅ Fireblocks vault management  
✅ Automatic gas funding from centralized vault  
✅ Transaction monitoring and status tracking  
✅ IPFS integration for VCs  
✅ Multi-blockchain support  
✅ Comprehensive error handling  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Create Asset │  │ Mint Request │  │  Marketplace │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Controllers Layer                       │  │
│  │  • token.controller.js                              │  │
│  │  • adminMintingRequest.controller.js                │  │
│  │  • tokenMintingRequest.controller.js                │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Services Layer                          │  │
│  │  • tokenService.js (Token Deployment)               │  │
│  │  • tokenPurchaseService.js (Transfers & VCs)        │  │
│  │  • fireblocks.service.js (Fireblocks SDK)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (Prisma/PostgreSQL)            │  │
│  │  • Token                                             │  │
│  │  • TokenMintingRequest                               │  │
│  │  • TokenOwnership                                    │  │
│  │  • User (with vault info)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Fireblocks API                             │
│  • Vault Management                                         │
│  • Token Deployment (Tokenization API)                      │
│  • Token Transfers (Transactions API)                       │
│  • Gas Management                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

### Core Implementation Files

```
backend/
├── services/
│   ├── tokenService.js                    # Token deployment & minting
│   ├── tokenPurchaseService.js            # Token transfers & VCs
│   ├── fireblocks.service.js              # Fireblocks SDK wrapper
│   └── vcService.js                       # Verifiable Credentials
│
├── controllers/
│   ├── token.controller.js                # Token CRUD operations
│   ├── adminMintingRequest.controller.js  # Admin approval flow
│   └── tokenMintingRequest.controller.js  # Issuer minting requests
│
├── routes/
│   ├── token.routes.js                    # Token endpoints
│   └── admin.routes.js                    # Admin endpoints
│
├── prisma/
│   └── schema.prisma                      # Database schema
│
├── tokenization-test/
│   └── fireblocks-token-creation.js       # Standalone test script
│
└── .env                                   # Configuration
```

### Documentation Files

```
docs/
├── setup/
│   ├── FIREBLOCKS_INTEGRATION.md
│   └── FIREBLOCKS_TOKEN_DEPLOYMENT_TROUBLESHOOTING.md
│
├── fireblocks-whitelisting-guide.md
│
└── flows/
    └── TOKEN_MINTING_REQUEST_FLOW.md

backend/guide/
├── services/
│   ├── TOKEN_SERVICE.md
│   ├── FIREBLOCKS_SERVICE.md
│   └── TOKEN_PURCHASE_SERVICE.md
│
└── controllers/
    └── TOKEN_CONTROLLER.md
```

**File Paths Summary:**
- Main Service: `backend/services/tokenService.js`
- Fireblocks Service: `backend/services/fireblocks.service.js`
- Purchase Service: `backend/services/tokenPurchaseService.js`
- Test Script: `backend/tokenization-test/fireblocks-token-creation.js`
- Documentation: `docs/setup/FIREBLOCKS_TOKEN_DEPLOYMENT_TROUBLESHOOTING.md`
- Guides: `backend/guide/services/TOKEN_SERVICE.md`

---

## 🔧 Core Services

### 1. Token Service (`backend/services/tokenService.js`)

**Purpose**: Handles token deployment and blockchain interactions

**Key Functions:**

#### `createToken(userId, tokenConfig)`
Creates token record and initiates deployment

```javascript
const tokenConfig = {
  tokenName: "Gold Token",
  tokenSymbol: "GOLD",
  selectedTemplate: "erc20f",
  totalSupply: "1000000",
  decimals: 18,
  network: "testnet",
  selectedNetwork: "ETH_TEST5",
  tokenDeployer: "fireblocks",
  description: "Gold-backed token",
  imageUrl: "https://..."
};

const result = await tokenService.createToken(userId, tokenConfig);
```

#### `deployToken(tokenId)`
Deploys token to blockchain via Fireblocks

**Process:**
1. Get token from database
2. Update status to PENDING
3. Route to appropriate deployment method (Ethereum/Solana/etc)
4. Call Fireblocks Tokenization API
5. Monitor deployment status
6. Update database with contract address

#### `deployEthereumToken(token)`
Ethereum-specific deployment using Fireblocks Tokenization Engine

```javascript
// Uses Fireblocks Tokenization API
const createTokenRequestDto = {
  blockchainId: "ETH_TEST5",
  assetId: "ETH_TEST5",
  vaultAccountId: "88",
  createParams: {
    contractId: "d39ba6d0-f738-4fab-ae00-874213375b5c",
    deployFunctionParams: [
      { name: "name", type: "string", value: "Gold Token" },
      { name: "symbol", type: "string", value: "GOLD" },
      { name: "decimals", type: "uint8", value: "18" },
      { name: "totalSupply", type: "uint256", value: "1000000000000000000000000" }
    ]
  },
  displayName: "Gold Token",
  useGasless: false,
  feeLevel: "MEDIUM"
};

const result = await fireblocks.tokenization.issueNewToken({ createTokenRequestDto });
```

#### `monitorTokenDeployment(tokenId, tokenLinkId)`
Monitors deployment until completion

**Supported Networks:**
- ETH_TEST5 (Ethereum Sepolia)
- ETH_TEST6 (Ethereum Sepolia)
- AMOY_POLYGON_TEST (Polygon Amoy)
- BSC_TEST (Binance Testnet)
- OPT_SEPOLIA (Optimism Sepolia)
- AVALANCHE_FUJI (Avalanche Testnet)
- BASECHAIN_ETH_TEST5 (Base Sepolia)
- ARB_SEPOLIA (Arbitrum Sepolia)
- SOL_TEST (Solana Devnet)

**Token Standards:**
- ERC20 (Fungible tokens)
- ERC721 (NFTs)
- ERC1155 (Multi-token)
- ERC1400 (Security tokens)
- SPL (Solana tokens)

---

### 2. Fireblocks Service (`backend/services/fireblocks.service.js`)

**Purpose**: Wrapper for Fireblocks SDK operations

**Key Functions:**

#### `testConnection()`
Test Fireblocks API connection

```javascript
const result = await fireblocksService.testConnection();
// Returns: { success: true, vaultCount: 10, message: 'Connection successful' }
```

#### `createVault(name, customerRefId)`
Create new vault account

```javascript
const result = await fireblocksService.createVault(
  'INVESTOR_john_1_1704067200000',
  '1' // userId
);
// Returns: { success: true, vault: {...}, vaultId: "88" }
```

#### `getVaultWallets(vaultId)`
Get wallet addresses for a vault

```javascript
const result = await fireblocksService.getVaultWallets('88');
// Returns: { 
//   success: true, 
//   wallets: [
//     { assetId: "ETH_TEST5", address: "0x123..." },
//     { assetId: "BTC_TEST", address: "tb1q..." }
//   ]
// }
```

#### `ensureAddressForAsset(vaultId, assetId)`
Ensure vault has address for asset; create if needed

```javascript
const address = await fireblocksService.ensureAddressForAsset('88', 'ETH_TEST5');
// Returns: "0x123..."
```

#### `ensureWhitelistedContract({ address, name, assetId })`
Whitelist smart contract for CONTRACT_CALL operations

```javascript
const result = await fireblocksService.ensureWhitelistedContract({
  address: '0x46b3b54BD109F989cbe3e4469Bc9909604277113',
  name: 'Token Contract',
  assetId: 'ETH_TEST5'
});
```

**Vault Naming Convention:**
```
{ROLE}_{emailPrefix}_{userId}_{timestamp}
Example: INVESTOR_john_1_1704067200000
```

---

### 3. Token Purchase Service (`backend/services/tokenPurchaseService.js`)

**Purpose**: Handles token transfers, ownership tracking, and VC generation

**Key Functions:**

#### `purchaseTokens(purchaseRequest)`
Complete token purchase flow

```javascript
const purchaseRequest = {
  tokenId: 1,
  amount: 100,
  investorId: 456,
  investorDid: "did:key:z6Mk...",
  investorVaultId: "89",
  purchasePrice: 0.5
};

const result = await tokenPurchaseService.purchaseTokens(purchaseRequest);
```

**Complete Flow:**
1. ✅ Validate investor vault (create if needed)
2. ✅ Get token details from database
3. ✅ Create TokenOwnership record (status: PENDING)
4. ✅ Optional: Pay issuer in ETH (if purchasePrice > 0)
5. ✅ Transfer gas from vault 88 to issuer vault
6. ✅ Transfer tokens from issuer vault to investor vault
7. ✅ Monitor transfer completion
8. ✅ Calculate ownership percentage
9. ✅ Update ownership record with transaction details
10. ✅ Generate Token Ownership VC
11. ✅ Sign VC
12. ✅ Upload VC to IPFS
13. ✅ Update ownership record with VC data

#### `transferTokens(token, amount, investorVaultId, ownershipId)`
Transfer tokens via Fireblocks

**Gas Management:**
- Checks issuer vault gas balance
- If insufficient, transfers gas from vault 88
- Minimum gas required: 0.001 ETH
- Transfers 2x minimum for safety

```javascript
// Gas funding check
const issuerGasBalance = parseFloat(issuerGasAsset?.available || '0');
const minGasRequired = 0.001;

if (issuerGasBalance < minGasRequired) {
  // Transfer gas from vault 88 to issuer vault
  const transferAmount = minGasRequired * 2;
  await fireblocks.transactions.createTransaction({
    transactionRequest: {
      assetId: networkAssetId,
      source: { type: 'VAULT_ACCOUNT', id: '88' },
      destination: { type: 'VAULT_ACCOUNT', id: sourceVaultId },
      amount: transferAmount.toString()
    }
  });
}
```

#### `monitorTransferCompletion(txId, ownershipId)`
Monitor transaction until completion

**Polling:**
- Checks every 10 seconds
- Max 30 attempts (5 minutes)
- Updates ownership status

#### `generateTokenOwnershipVC(transferData, ownershipData, investorData, token)`
Generate Verifiable Credential for token ownership

**VC Structure:**
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "https://copym.xyz/credentials/vc-123",
  "type": ["VerifiableCredential", "TokenOwnershipCredential"],
  "issuer": "did:key:issuer",
  "issuanceDate": "2025-12-26T00:00:00.000Z",
  "credentialSubject": {
    "id": "did:key:investor",
    "tokenOwnership": {
      "tokenId": 1,
      "tokenName": "Gold Token",
      "tokenSymbol": "GOLD",
      "contractAddress": "0x123...",
      "blockchain": "ethereum",
      "network": "ETH_TEST5",
      "amount": "100",
      "totalSupply": "1000000",
      "ownershipPercentage": 0.01,
      "vaultId": "89",
      "purchaseDate": "2025-12-26T00:00:00.000Z",
      "transactionHash": "0xabc..."
    }
  },
  "evidence": [{
    "type": "BlockchainTransaction",
    "transactionHash": "0xabc...",
    "blockchainNetwork": "ethereum ETH_TEST5",
    "gasUsed": "0.001"
  }]
}
```

---

## 🔄 Token Deployment Flow

### Complete Deployment Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ISSUER: Create Asset                                    │
│    • Upload documents                                       │
│    • Fill asset details                                     │
│    • Submit for admin review                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ADMIN: Review & Approve Asset                           │
│    • Verify documents                                       │
│    • Check compliance                                       │
│    • Approve/Reject                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ISSUER: Create Minting Request                          │
│    • Select approved asset                                  │
│    • Specify token details:                                 │
│      - Token name & symbol                                  │
│      - Total supply                                         │
│      - Decimals                                             │
│      - Network (ETH_TEST5, etc)                             │
│    • Submit minting request                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DATABASE: Create TokenMintingRequest                    │
│    • Status: PENDING                                        │
│    • Store token configuration                              │
│    • Link to asset and issuer                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ADMIN: Review Minting Request                           │
│    • Check token details                                    │
│    • Verify compliance                                      │
│    • Approve/Reject with notes                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. BACKEND: Auto-Deploy Token (on approval)                │
│    • Status: MINTING                                        │
│    • Call tokenService.createToken()                        │
│    • Create Token record in database                        │
│    • Status: CREATING                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. TOKEN SERVICE: Deploy to Blockchain                     │
│    • Status: PENDING                                        │
│    • Get issuer vault ID                                    │
│    • Fund issuer vault with gas from vault 88              │
│    • Call Fireblocks Tokenization API                       │
│    • Status: DEPLOYING                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. FIREBLOCKS: Deploy Smart Contract                       │
│    • Create deployment transaction                          │
│    • Deploy contract to blockchain                          │
│    • Return tokenLinkId & contract address                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. TOKEN SERVICE: Monitor Deployment                       │
│    • Poll tokenization status every 10s                     │
│    • Check for COMPLETED/FAILED                             │
│    • Max 30 attempts (5 minutes)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. DATABASE: Update Token Record                          │
│     • Status: DEPLOYED                                      │
│     • Store contract address                                │
│     • Store transaction hash                                │
│     • Store Fireblocks assetId                              │
│     • Update TokenMintingRequest: COMPLETED                 │
└─────────────────────────────────────────────────────────────┘
```

### Code Example: Complete Deployment

```javascript
// 1. Issuer creates minting request
POST /api/tokens/minting-request
{
  "assetId": 1,
  "tokenName": "Gold Token",
  "tokenSymbol": "GOLD",
  "totalSupply": "1000000",
  "decimals": 18,
  "selectedNetwork": "ETH_TEST5"
}

// 2. Admin approves minting request
POST /api/admin/minting-requests/:id/approve
{
  "notes": "Approved for deployment"
}

// 3. Backend auto-deploys (adminMintingRequest.controller.js)
const tokenConfig = {
  tokenName: request.tokenName,
  tokenSymbol: request.tokenSymbol,
  totalSupply: request.totalSupply,
  decimals: request.decimals,
  selectedNetwork: request.selectedNetwork,
  selectedTemplate: "erc20f",
  tokenDeployer: "fireblocks"
};

const tokenResult = await tokenService.createToken(request.userId, tokenConfig);

// 4. Token service deploys to Fireblocks
const createTokenRequestDto = {
  blockchainId: "ETH_TEST5",
  assetId: "ETH_TEST5",
  vaultAccountId: issuerVaultId,
  createParams: {
    contractId: process.env.FIREBLOCKS_CONTRACT_TEMPLATE_ID,
    deployFunctionParams: [
      { name: "name", type: "string", value: "Gold Token" },
      { name: "symbol", type: "string", value: "GOLD" },
      { name: "decimals", type: "uint8", value: "18" },
      { name: "totalSupply", type: "uint256", value: "1000000000000000000000000" }
    ]
  },
  displayName: "Gold Token",
  useGasless: false,
  feeLevel: "MEDIUM"
};

const result = await fireblocks.tokenization.issueNewToken({ createTokenRequestDto });

// 5. Monitor deployment
let status = 'DEPLOYING';
while (status === 'DEPLOYING') {
  await new Promise(r => setTimeout(r, 10000));
  const link = await fireblocks.tokenization.getLinkedToken({ id: tokenLinkId });
  status = link.data.status;
}

// 6. Update database
await prisma.token.update({
  where: { id: tokenId },
  data: {
    status: 'DEPLOYED',
    contractAddress: link.data.tokenMetadata.contractAddress,
    transactionHash: link.data.txHash,
    metadata: {
      tokenLinkId: link.data.id,
      assetId: link.data.assetId
    }
  }
});
```

---

## 💸 Token Purchase & Transfer Flow

### Complete Purchase Process

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INVESTOR: Browse Marketplace                            │
│    • View listed tokens                                     │
│    • Check price and availability                           │
│    • Click "Purchase"                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND: Submit Purchase Request                       │
│    POST /api/marketplace/purchase                           │
│    {                                                        │
│      "listingId": 1,                                        │
│      "amount": 100                                          │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND: Validate Purchase                              │
│    • Check listing exists and is active                     │
│    • Verify sufficient tokens available                     │
│    • Get investor vault ID (create if needed)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DATABASE: Create TokenOwnership Record                  │
│    • Status: PENDING                                        │
│    • Link to token, investor, issuer                        │
│    • Store amount and price                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. PAYMENT: Transfer ETH (if price > 0)                    │
│    • Investor vault → Issuer vault                          │
│    • Amount: price * quantity                               │
│    • Monitor payment completion                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. GAS FUNDING: Ensure Issuer Has Gas                      │
│    • Check issuer vault gas balance                         │
│    • If < 0.001 ETH:                                        │
│      - Transfer 0.002 ETH from vault 88                     │
│      - Wait for completion                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. TOKEN TRANSFER: Issuer → Investor                       │
│    • Status: TRANSFERRING                                   │
│    • Source: Issuer vault (has tokens + gas)                │
│    • Destination: Investor vault                            │
│    • Asset: Token assetId (ETH_0x123... or native)         │
│    • Amount: Purchased quantity                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. FIREBLOCKS: Execute Transfer                            │
│    • Create transaction                                     │
│    • Deduct from issuer vault                               │
│    • Credit to investor vault                               │
│    • Return transaction ID                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. MONITOR: Wait for Completion                            │
│    • Poll transaction status every 10s                      │
│    • Check for COMPLETED/FAILED                             │
│    • Max 30 attempts (5 minutes)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. CALCULATE: Ownership Percentage                        │
│     • Ownership % = (amount / totalSupply) * 100            │
│     • Example: 100 / 1,000,000 = 0.01%                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. DATABASE: Update Ownership Record                      │
│     • Status: COMPLETED                                     │
│     • Store transaction hash                                │
│     • Store ownership percentage                            │
│     • Store gas used                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 12. VC GENERATION: Create Ownership VC                     │
│     • Generate VC with token details                        │
│     • Include transaction evidence                          │
│     • Sign VC (mock or real DIDKit)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 13. IPFS: Upload VC                                        │
│     • Upload signed VC to Pinata                            │
│     • Get IPFS hash (Qm...)                                 │
│     • Get gateway URL                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 14. DATABASE: Store VC Data                                │
│     • Update ownership with VC hash                         │
│     • Store VC URL                                          │
│     • Store signed VC JSON                                  │
│     • Mark as verified (if real signing)                    │
└─────────────────────────────────────────────────────────────┘
```

### Code Example: Complete Purchase

```javascript
// Purchase tokens
const result = await tokenPurchaseService.purchaseTokens({
  tokenId: 1,
  amount: 100,
  investorId: 456,
  investorDid: "did:key:z6Mk...",
  investorVaultId: "89",
  purchasePrice: 0.5
});

// Result structure
{
  success: true,
  ownershipRecord: {
    id: 123,
    tokenId: 1,
    investorId: 456,
    amount: "100",
    percent: 0.01,
    purchasePrice: 0.5,
    transactionHash: "0xabc...",
    vcHash: "Qm...",
    vcUrl: "https://gateway.pinata.cloud/ipfs/Qm...",
    status: "COMPLETED"
  },
  transferData: {
    id: "tx-123",
    txHash: "0xabc...",
    networkFee: "0.001"
  },
  vcData: {
    vc: { /* VC JSON */ },
    ipfsHash: "Qm...",
    ipfsUrl: "https://..."
  }
}
```

---

## 🔥 Fireblocks Integration Details

### SDK Initialization

```javascript
import { Fireblocks, BasePath } from '@fireblocks/ts-sdk';
import { readFileSync } from 'fs';

const secretKey = readFileSync('./fireblock.pem', 'utf8');

const fireblocks = new Fireblocks({
  apiKey: process.env.FIREBLOCKS_API_KEY,
  secretKey: secretKey,
  basePath: BasePath.Sandbox // or BasePath.US for production
});
```

### Vault Management

#### Create Vault
```javascript
const response = await fireblocks.vaults.createVaultAccount({
  createVaultAccountRequest: {
    name: "INVESTOR_john_1_1704067200000",
    hiddenOnUI: false,
    autoFuel: true,
    customerRefId: "1" // userId
  }
});
```

#### Get Vault Info
```javascript
const response = await fireblocks.vaults.getVaultAccount({
  vaultAccountId: "88"
});
```

#### Create Asset in Vault
```javascript
await fireblocks.vaults.createVaultAccountAsset({
  vaultAccountId: "88",
  assetId: "ETH_TEST5"
});
```

#### Create Deposit Address
```javascript
const addr = await fireblocks.vaults.createVaultAccountDepositAddress({
  vaultAccountId: "88",
  assetId: "ETH_TEST5",
  createDepositAddressRequest: {
    description: "Primary address"
  }
});
```

### Token Deployment

#### Issue New Token (Tokenization API)
```javascript
const createTokenRequestDto = {
  blockchainId: "ETH_TEST5",
  assetId: "ETH_TEST5",
  vaultAccountId: "88",
  createParams: {
    contractId: "d39ba6d0-f738-4fab-ae00-874213375b5c",
    deployFunctionParams: [
      { name: "name", type: "string", value: "Gold Token" },
      { name: "symbol", type: "string", value: "GOLD" },
      { name: "decimals", type: "uint8", value: "18" },
      { name: "totalSupply", type: "uint256", value: "1000000000000000000000000" }
    ]
  },
  displayName: "Gold Token",
  useGasless: false,
  feeLevel: "MEDIUM"
};

const result = await fireblocks.tokenization.issueNewToken({ createTokenRequestDto });
```

#### Get Token Link Status
```javascript
const link = await fireblocks.tokenization.getLinkedToken({ 
  id: tokenLinkId 
});

// Check status
if (link.data.status === 'COMPLETED') {
  const contractAddress = link.data.tokenMetadata.contractAddress;
  const assetId = link.data.assetId;
}
```

### Token Transfers

#### Transfer Tokens Between Vaults
```javascript
const transferRequest = {
  assetId: "ETH_0x46b3b54BD109F989cbe3e4469Bc9909604277113", // Token asset ID
  source: {
    type: "VAULT_ACCOUNT",
    id: "102" // Issuer vault
  },
  destination: {
    type: "VAULT_ACCOUNT",
    id: "89" // Investor vault
  },
  amount: "100",
  note: "Token purchase: 100 GOLD",
  feeLevel: "MEDIUM"
};

const result = await fireblocks.transactions.createTransaction({
  transactionRequest: transferRequest
});
```

#### Transfer Native ETH (for gas or payment)
```javascript
const transferRequest = {
  assetId: "ETH_TEST5",
  source: { type: "VAULT_ACCOUNT", id: "88" },
  destination: { type: "VAULT_ACCOUNT", id: "102" },
  amount: "0.002",
  note: "Gas funding"
};

const result = await fireblocks.transactions.createTransaction({
  transactionRequest: transferRequest
});
```

#### Monitor Transaction
```javascript
const tx = await fireblocks.transactions.getTransaction({ 
  txId: "tx-123" 
});

console.log(tx.data.status); // SUBMITTED, PENDING, COMPLETED, FAILED
console.log(tx.data.txHash); // Blockchain transaction hash
console.log(tx.data.networkFee); // Gas fee paid
```

### Contract Whitelisting

```javascript
// Create whitelisted contract
const resp = await fireblocks.contracts.createContract({
  createContractRequest: {
    name: "Token Contract",
    assets: [{
      id: "ETH_TEST5",
      address: "0x46b3b54BD109F989cbe3e4469Bc9909604277113",
      tag: ""
    }]
  }
});

// List whitelisted contracts
const list = await fireblocks.contracts.getContracts();
```

### Gas Vault System

**Centralized Gas Management:**
- Vault 88 is the centralized gas vault
- All gas fees are funded from vault 88
- Before token transfers, gas is transferred from vault 88 to issuer vault
- Issuer vault then has gas to execute token transfers

**Benefits:**
- Simplified gas management
- Single point of funding
- Automatic gas distribution
- Cost tracking

**Implementation:**
```javascript
// Check issuer vault gas
const issuerVault = await fireblocks.vaults.getVaultAccount({
  vaultAccountId: issuerVaultId
});
const gasBalance = parseFloat(issuerVault.data.assets.find(a => a.id === 'ETH_TEST5')?.available || '0');

// If insufficient, fund from vault 88
if (gasBalance < 0.001) {
  await fireblocks.transactions.createTransaction({
    transactionRequest: {
      assetId: 'ETH_TEST5',
      source: { type: 'VAULT_ACCOUNT', id: '88' },
      destination: { type: 'VAULT_ACCOUNT', id: issuerVaultId },
      amount: '0.002'
    }
  });
}
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Fireblocks Configuration
FIREBLOCKS_API_KEY=cdfb14c1-72ca-4f26-bd54-32a53b1550a0
FIREBLOCKS_SECRET_KEY_PATH=./fireblock.pem
FIREBLOCKS_BASE_URL=https://sandbox-api.fireblocks.io/v1
FIREBLOCKS_CONTRACT_TEMPLATE_ID=d39ba6d0-f738-4fab-ae00-874213375b5c

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/copym

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt_token

# Optional
USE_MOCK_TRANSFER=false
```

### Fireblocks Setup Requirements

1. **API Key & Secret Key**
   - Generate API key in Fireblocks Console
   - Download secret key file (PEM format)
   - Store securely, never commit to git

2. **Vault Setup**
   - Create vault 88 as centralized gas vault
   - Fund vault 88 with ETH_TEST5 (minimum 0.1 ETH)
   - Create vaults for each user (auto-created by system)

3. **TAP Policy Configuration**
   - Go to Fireblocks Console → Settings → Transaction Authorization Policy
   - Create rule allowing tokenization and transfers

**Required TAP Policy:**
```json
{
  "action": "ALLOW",
  "transactionType": "CONTRACT_CALL",
  "asset": "*",
  "src": {
    "ids": [["*", "VAULT", "*"]]
  },
  "dst": {
    "ids": [["*", "UNMANAGED", "*"], ["*", "EXTERNAL_WALLET", "*"]]
  },
  "amountCurrency": "USD",
  "amountScope": "SINGLE_TX",
  "amount": "100000",
  "applyForApprove": true,
  "applyForTypedMessage": true,
  "applyForDeployment": true
}
```

4. **Contract Template**
   - Upload ERC20 contract template to Fireblocks
   - Get template ID
   - Set in environment variable

5. **Network Configuration**
   - Enable ETH_TEST5 (Sepolia) in Fireblocks Console
   - Enable other networks as needed
   - Ensure tokenization is allowed on networks

### Database Schema

```prisma
model Token {
  id              Int       @id @default(autoincrement())
  userId          Int
  name            String
  symbol          String
  contractAddress String?
  network         String
  selectedNetwork String
  blockchain      String
  standard        String
  totalSupply     String
  decimals        Int
  status          String    // CREATING, PENDING, DEPLOYING, DEPLOYED, FAILED
  vaultId         String
  gasVaultId      String    @default("88")
  transactionId   String?
  tokenType       String
  assetCategory   String?
  templateId      String?
  imageUrl        String?
  metadata        Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id])
  ownerships      TokenOwnership[]
}

model TokenOwnership {
  id              Int       @id @default(autoincrement())
  tokenId         Int
  investorId      Int
  amount          String
  percent         Float?
  purchasePrice   Float?
  investorDid     String?
  issuerDid       String?
  transactionId   String?
  transactionHash String?
  gasUsed         String?
  networkFee      String?
  vcHash          String?
  vcUrl           String?
  vcSigned        String?
  vcVerified      Boolean   @default(false)
  status          String    // PENDING, TRANSFERRING, COMPLETED, FAILED
  errorMessage    String?
  purchasedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  token           Token     @relation(fields: [tokenId], references: [id])
  investor        User      @relation(fields: [investorId], references: [id])
}

model TokenMintingRequest {
  id              Int       @id @default(autoincrement())
  userId          Int
  assetId         Int
  tokenName       String
  tokenSymbol     String
  totalSupply     String
  decimals        Int       @default(18)
  selectedNetwork String
  status          String    // PENDING, APPROVED, REJECTED, MINTING, COMPLETED, FAILED
  adminNotes      String?
  rejectionReason String?
  approvedBy      Int?
  approvedAt      DateTime?
  rejectedAt      DateTime?
  mintedTokenId   Int?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id])
  asset           Asset     @relation(fields: [assetId], references: [id])
  approver        User?     @relation("ApprovedRequests", fields: [approvedBy], references: [id])
  mintedToken     Token?    @relation(fields: [mintedTokenId], references: [id])
}

model User {
  id                  Int       @id @default(autoincrement())
  email               String    @unique
  role                String    // ADMIN, ISSUER, INVESTOR
  fireblocksVaultId   String?
  fireblocksVaultName String?
  vaultCreated        Boolean   @default(false)
  vaultCreatedAt      DateTime?
  
  tokens              Token[]
  ownerships          TokenOwnership[]
  mintingRequests     TokenMintingRequest[]
  approvedRequests    TokenMintingRequest[] @relation("ApprovedRequests")
}
```

---

## 🌐 API Endpoints

### Token Endpoints

#### Create Minting Request
```http
POST /api/tokens/minting-request
Authorization: Bearer <token>
Content-Type: application/json

{
  "assetId": 1,
  "tokenName": "Gold Token",
  "tokenSymbol": "GOLD",
  "totalSupply": "1000000",
  "decimals": 18,
  "selectedNetwork": "ETH_TEST5"
}

Response:
{
  "success": true,
  "request": {
    "id": 1,
    "status": "PENDING",
    "tokenName": "Gold Token",
    "tokenSymbol": "GOLD"
  }
}
```

#### Get User Tokens
```http
GET /api/tokens
Authorization: Bearer <token>

Response:
{
  "success": true,
  "tokens": [
    {
      "id": 1,
      "name": "Gold Token",
      "symbol": "GOLD",
      "contractAddress": "0x123...",
      "status": "DEPLOYED",
      "totalSupply": "1000000",
      "decimals": 18
    }
  ]
}
```

#### Get Token Stats
```http
GET /api/tokens/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "stats": {
    "total": 10,
    "deployed": 8,
    "pending": 1,
    "failed": 1,
    "byType": {
      "ERC20": 8,
      "ERC721": 2
    }
  }
}
```

#### List Token on Marketplace
```http
POST /api/tokens/:id/list
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000,
  "price": 0.5
}

Response:
{
  "success": true,
  "message": "Token listed successfully",
  "token": {
    "id": 1,
    "metadata": {
      "marketplace": {
        "listed": true,
        "amount": 1000,
        "price": 0.5
      }
    }
  }
}
```

### Admin Endpoints

#### Get All Minting Requests
```http
GET /api/admin/minting-requests
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "requests": [
    {
      "id": 1,
      "tokenName": "Gold Token",
      "tokenSymbol": "GOLD",
      "status": "PENDING",
      "user": {
        "email": "issuer@example.com"
      },
      "asset": {
        "name": "Gold Bar"
      }
    }
  ]
}
```

#### Approve Minting Request
```http
POST /api/admin/minting-requests/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "notes": "Approved for deployment"
}

Response:
{
  "success": true,
  "message": "Minting request approved and token deployment initiated",
  "request": {
    "id": 1,
    "status": "MINTING"
  },
  "token": {
    "id": 1,
    "status": "CREATING"
  }
}
```

#### Reject Minting Request
```http
POST /api/admin/minting-requests/:id/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Insufficient documentation"
}

Response:
{
  "success": true,
  "message": "Minting request rejected",
  "request": {
    "id": 1,
    "status": "REJECTED",
    "rejectionReason": "Insufficient documentation"
  }
}
```

### Marketplace Endpoints

#### Get Marketplace Listings
```http
GET /api/tokens/marketplace
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "listings": [
      {
        "escrowId": "token-1",
        "status": "DEPLOYED",
        "available": true,
        "network": "ethereum",
        "environment": "sepolia",
        "issuer": {
          "id": 123,
          "email": "issuer@example.com"
        },
        "token": {
          "id": 1,
          "name": "Gold Token",
          "symbol": "GOLD",
          "contractAddress": "0x123...",
          "totalSupply": "1000000"
        },
        "tokenAmount": 1000,
        "priceETH": 0.5
      }
    ]
  }
}
```

#### Purchase Tokens
```http
POST /api/marketplace/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": 1,
  "amount": 100
}

Response:
{
  "success": true,
  "message": "Token purchase completed successfully",
  "ownership": {
    "id": 123,
    "tokenId": 1,
    "amount": "100",
    "percent": 0.01,
    "transactionHash": "0xabc...",
    "vcHash": "Qm...",
    "vcUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
    "status": "COMPLETED"
  }
}
```

### Vault Endpoints

#### Create Vault
```http
POST /api/vault/create
Authorization: Bearer <token>

Response:
{
  "success": true,
  "vault": {
    "id": "89",
    "name": "INVESTOR_john_1_1704067200000"
  }
}
```

#### Get Vault Info
```http
GET /api/vault/info
Authorization: Bearer <token>

Response:
{
  "success": true,
  "vault": {
    "id": "89",
    "name": "INVESTOR_john_1_1704067200000",
    "assets": [
      {
        "id": "ETH_TEST5",
        "balance": "0.5",
        "available": "0.5"
      }
    ]
  }
}
```

#### Get Vault Wallets
```http
GET /api/vault/wallets
Authorization: Bearer <token>

Response:
{
  "success": true,
  "wallets": [
    {
      "assetId": "ETH_TEST5",
      "address": "0x123..."
    },
    {
      "assetId": "BTC_TEST",
      "address": "tb1q..."
    }
  ]
}
```

---

## 🧪 Testing Scripts

### 1. Standalone Token Creation Test

**File**: `backend/tokenization-test/fireblocks-token-creation.js`

**Purpose**: Test Fireblocks Tokenization API directly without backend

```javascript
// Run test
cd backend/tokenization-test
node fireblocks-token-creation.js

// Expected output:
// Creating token on Fireblocks...
// Status Code: 200
// Response Body: {
//   "id": "3e581c2f-f6dc-40a3-8e0f-d690e10942c4",
//   "status": "DEPLOYING",
//   "tokenMetadata": {
//     "contractAddress": "0x123..."
//   }
// }
```

**Configuration:**
- Uses environment variables from `.env`
- Generates JWT token for authentication
- Sends POST request to `/v1/tokenization/tokens`
- Returns token link ID and status

### 2. Full Integration Test

```javascript
// Test complete flow
async function testTokenization() {
  // 1. Create minting request
  const mintRequest = await axios.post('http://localhost:5000/api/tokens/minting-request', {
    assetId: 1,
    tokenName: "Test Token",
    tokenSymbol: "TEST",
    totalSupply: "1000000",
    decimals: 18,
    selectedNetwork: "ETH_TEST5"
  }, {
    headers: { Authorization: `Bearer ${issuerToken}` }
  });
  
  console.log('Minting request created:', mintRequest.data.request.id);
  
  // 2. Admin approves
  const approval = await axios.post(
    `http://localhost:5000/api/admin/minting-requests/${mintRequest.data.request.id}/approve`,
    { notes: "Test approval" },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  
  console.log('Minting approved, token deploying...');
  
  // 3. Wait for deployment
  let token;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const tokens = await axios.get('http://localhost:5000/api/tokens', {
      headers: { Authorization: `Bearer ${issuerToken}` }
    });
    token = tokens.data.tokens.find(t => t.id === approval.data.token.id);
    if (token.status === 'DEPLOYED') break;
  }
  
  console.log('Token deployed:', token.contractAddress);
  
  // 4. List on marketplace
  await axios.post(`http://localhost:5000/api/tokens/${token.id}/list`, {
    amount: 1000,
    price: 0.5
  }, {
    headers: { Authorization: `Bearer ${issuerToken}` }
  });
  
  console.log('Token listed on marketplace');
  
  // 5. Purchase tokens
  const purchase = await axios.post('http://localhost:5000/api/marketplace/purchase', {
    listingId: token.id,
    amount: 100
  }, {
    headers: { Authorization: `Bearer ${investorToken}` }
  });
  
  console.log('Purchase completed:', purchase.data.ownership);
  console.log('VC URL:', purchase.data.ownership.vcUrl);
}
```

### 3. Gas Vault Test

```javascript
// Test gas funding
async function testGasFunding() {
  const fireblocksService = require('./services/fireblocks.service.js').default;
  
  // Check vault 88 balance
  const gasVault = await fireblocksService.getVaultInfo('88');
  const ethBalance = gasVault.vault.assets.find(a => a.id === 'ETH_TEST5');
  console.log('Gas vault balance:', ethBalance.available, 'ETH');
  
  // Fund issuer vault
  const issuerVaultId = '102';
  const result = await fireblocksService.fireblocks.transactions.createTransaction({
    transactionRequest: {
      assetId: 'ETH_TEST5',
      source: { type: 'VAULT_ACCOUNT', id: '88' },
      destination: { type: 'VAULT_ACCOUNT', id: issuerVaultId },
      amount: '0.002',
      note: 'Test gas funding'
    }
  });
  
  console.log('Gas transfer initiated:', result.data.id);
  
  // Monitor completion
  let status = 'SUBMITTED';
  while (status !== 'COMPLETED') {
    await new Promise(r => setTimeout(r, 5000));
    const tx = await fireblocksService.fireblocks.transactions.getTransaction({
      txId: result.data.id
    });
    status = tx.data.status;
    console.log('Status:', status);
  }
  
  console.log('Gas funding completed!');
}
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. Token Deployment Fails with "FAILED" Status

**Symptoms:**
- Token reaches Fireblocks but fails
- No detailed error message
- Status shows FAILED

**Most Likely Causes:**

**A. TAP Policy Not Configured** ⭐ MOST COMMON
```
Solution:
1. Go to Fireblocks Console → Settings → Transaction Authorization Policy
2. Create rule with:
   - transactionType: CONTRACT_CALL
   - applyForDeployment: true (CRITICAL)
   - Source: Include vault 88 and issuer vaults
   - Destination: Allow UNMANAGED and EXTERNAL_WALLET
   - Amount: Set high enough limit (e.g., $100,000)
```

**B. Tokenization API Not Enabled**
```
Solution:
1. Go to Fireblocks Console → Settings → Workspace Settings
2. Enable "Tokenization" feature
3. Note: May require premium Fireblocks plan
```

**C. API User Permissions Insufficient**
```
Solution:
1. Go to Fireblocks Console → Settings → Users
2. Find your API user
3. Ensure role is Editor or Admin (not Viewer)
4. Grant "Tokenization" permission
```

**D. Contract Template Not Approved**
```
Solution:
1. Go to Fireblocks Console → Tokenization → Templates
2. Find your template ID
3. Ensure status is "Approved" or "Active"
```

#### 2. Token Transfer Fails with "Invalid Destination"

**Symptoms:**
- Error code 1428
- "One or more destinations are invalid"

**Solution: Whitelist Contract Address**
```
1. Go to Fireblocks Console → Settings → Contract Addresses
2. Click "Add Contract Address"
3. Enter:
   - Contract Address: 0x46b3b54BD109F989cbe3e4469Bc9909604277113
   - Contract Name: Token Contract
   - Blockchain: Ethereum
   - Network: Sepolia
4. Wait for approval (few minutes)
5. Retry transfer
```

#### 3. Insufficient Gas Errors

**Symptoms:**
- "INSUFFICIENT_FUNDS" error
- Transfer fails before execution

**Solution: Fund Gas Vault**
```
1. Check vault 88 balance:
   GET /api/vault/info (with vault 88)
   
2. If balance < 0.1 ETH:
   - Go to Fireblocks Console
   - Navigate to vault 88
   - Add ETH_TEST5 asset
   - Use faucet: https://sepoliafaucet.com
   - Send 0.5 ETH to vault 88 address
   
3. Verify balance updated
4. Retry operation
```

#### 4. Vault Creation Fails

**Symptoms:**
- "Failed to create vault" error
- User has no vault ID

**Solution:**
```javascript
// Manual vault creation
const fireblocksService = require('./services/fireblocks.service.js').default;

const result = await fireblocksService.createVault(
  'INVESTOR_john_1_' + Date.now(),
  userId
);

if (result.success) {
  // Update user in database
  await prisma.user.update({
    where: { id: userId },
    data: {
      fireblocksVaultId: result.vault.id,
      fireblocksVaultName: result.vault.name,
      vaultCreated: true
    }
  });
}
```

#### 5. Transaction Stuck in PENDING

**Symptoms:**
- Transaction status never changes from PENDING
- Monitoring times out

**Solution:**
```
1. Check Fireblocks Console → Activity tab
2. Find transaction by ID
3. Check for:
   - Pending approvals (Admin Quorum)
   - TAP policy blocks
   - Network congestion
   
4. If Admin Quorum required:
   - Get required admins to approve in console
   
5. If TAP policy blocks:
   - Update TAP policy to allow operation
   
6. If network congestion:
   - Wait longer or increase fee level to HIGH
```

#### 6. VC Generation Fails

**Symptoms:**
- Purchase completes but no VC
- vcHash is null

**Solution:**
```
1. Check IPFS credentials:
   - Verify PINATA_JWT is set
   - Test Pinata connection
   
2. Check investor DID:
   - Ensure investor has DID created
   - Verify DID format is correct
   
3. Manual VC generation:
   const vcService = require('./services/vcService.js');
   const vc = await vcService.generateTokenOwnershipVC(...);
   const ipfsResult = await vcService.uploadVCToIPFS(vc);
   
   // Update ownership record
   await prisma.tokenOwnership.update({
     where: { id: ownershipId },
     data: {
       vcHash: ipfsResult.ipfsHash,
       vcUrl: ipfsResult.ipfsUrl
     }
   });
```

#### 7. Asset ID Not Found

**Symptoms:**
- "Asset not found in vault" error
- Transfer fails with asset ID error

**Solution:**
```javascript
// Ensure asset exists in vault
const fireblocksService = require('./services/fireblocks.service.js').default;

// Create asset in vault
await fireblocksService.fireblocks.vaults.createVaultAccountAsset({
  vaultAccountId: vaultId,
  assetId: tokenAssetId
});

// Wait for asset to be registered
await new Promise(r => setTimeout(r, 2000));

// Retry transfer
```

### Debugging Tools

#### 1. Check Fireblocks Connection
```javascript
const fireblocksService = require('./services/fireblocks.service.js').default;
const result = await fireblocksService.testConnection();
console.log(result);
// { success: true, vaultCount: 10, message: 'Connection successful' }
```

#### 2. Get Transaction Details
```javascript
const tx = await fireblocksService.fireblocks.transactions.getTransaction({
  txId: 'tx-123'
});
console.log('Status:', tx.data.status);
console.log('Sub-status:', tx.data.subStatus);
console.log('Error:', tx.data.error);
```

#### 3. Check Vault Balance
```javascript
const vault = await fireblocksService.fireblocks.vaults.getVaultAccount({
  vaultAccountId: '88'
});
vault.data.assets.forEach(asset => {
  console.log(`${asset.id}: ${asset.available} (${asset.total})`);
});
```

#### 4. List All Vaults
```javascript
const vaults = await fireblocksService.listVaults();
console.log('Total vaults:', vaults.total);
vaults.vaults.forEach(v => {
  console.log(`Vault ${v.id}: ${v.name}`);
});
```

#### 5. Monitor Token Deployment
```javascript
const tokenLinkId = '3e581c2f-f6dc-40a3-8e0f-d690e10942c4';
let status = 'DEPLOYING';

while (status === 'DEPLOYING') {
  await new Promise(r => setTimeout(r, 10000));
  const link = await fireblocksService.fireblocks.tokenization.getLinkedToken({
    id: tokenLinkId
  });
  status = link.data.status;
  console.log('Status:', status);
  
  if (status === 'COMPLETED') {
    console.log('Contract:', link.data.tokenMetadata.contractAddress);
    console.log('Asset ID:', link.data.assetId);
  }
}
```

### Error Codes Reference

| Code | Error | Solution |
|------|-------|----------|
| 1428 | Invalid destination | Whitelist contract address |
| 403 | Permission denied | Check API user permissions & TAP policy |
| 400 | Invalid request | Verify request parameters |
| 500 | Internal error | Check TAP policy, often deployment not allowed |
| 404 | Not found | Verify resource exists (vault, asset, etc) |

### Logs to Check

1. **Backend Logs**
   - Token deployment progress
   - Transfer status
   - Error messages

2. **Fireblocks Console → Activity**
   - Transaction details
   - Failure reasons
   - Approval status

3. **Database**
   - Token status
   - Ownership records
   - Transaction IDs

---

## 🔒 Security Considerations

### API Key Management

**Best Practices:**
```
✅ Store API key in environment variables
✅ Never commit secret key file to git
✅ Use .gitignore for fireblock.pem
✅ Rotate API keys regularly (every 90 days)
✅ Use different keys for dev/staging/production
✅ Restrict API key permissions to minimum required
```

**Secret Key File:**
```bash
# Set proper permissions
chmod 600 fireblock.pem

# Verify permissions
ls -la fireblock.pem
# Should show: -rw------- (600)
```

### Vault Security

**Recommendations:**
```
✅ Enable Admin Quorum for high-value operations
✅ Use TAP policies to restrict operations
✅ Enable MFA for all admin users
✅ Regularly audit vault access logs
✅ Use separate vaults for different user roles
✅ Enable auto-fuel for convenience but monitor usage
```

### Transaction Security

**Validation:**
```javascript
// Always validate before transfers
if (!token || token.status !== 'DEPLOYED') {
  throw new Error('Token not available');
}

if (amount <= 0 || amount > availableAmount) {
  throw new Error('Invalid amount');
}

if (!investorVaultId || !issuerVaultId) {
  throw new Error('Invalid vault IDs');
}

// Verify ownership
if (token.userId !== issuerId) {
  throw new Error('Not token owner');
}
```

### Database Security

**Sensitive Data:**
```
✅ Never store private keys in database
✅ Hash sensitive information
✅ Use parameterized queries (Prisma handles this)
✅ Implement row-level security
✅ Regular backups
✅ Encrypt database at rest
```

### Network Security

**API Communication:**
```
✅ Always use HTTPS
✅ Validate SSL certificates
✅ Implement rate limiting
✅ Use JWT tokens with expiration
✅ Implement CORS properly
✅ Log all API requests
```

### Smart Contract Security

**Deployment:**
```
✅ Audit contract code before deployment
✅ Use verified contract templates
✅ Test on testnet first
✅ Implement pausable functionality
✅ Use upgradeable patterns when needed
✅ Monitor contract events
```

### Monitoring & Alerts

**Set up alerts for:**
```
- Failed transactions
- Unusual vault activity
- Low gas balances
- API errors
- Unauthorized access attempts
- Large transfers
```

---

## 📊 Performance Optimization

### Gas Optimization

**Centralized Gas Management:**
```javascript
// Benefits:
// - Single point of funding
// - Automatic distribution
// - Cost tracking
// - Simplified accounting

// Implementation:
const gasVaultId = '88';

// Fund all operations from vault 88
// Transfer gas to issuer vaults as needed
// Monitor vault 88 balance
// Alert when balance < threshold
```

### Transaction Batching

**For multiple transfers:**
```javascript
// Instead of sequential transfers
for (const transfer of transfers) {
  await transferTokens(transfer); // Slow
}

// Use Promise.all for parallel execution
await Promise.all(
  transfers.map(transfer => transferTokens(transfer))
); // Fast
```

### Caching

**Cache frequently accessed data:**
```javascript
// Cache vault info
const vaultCache = new Map();

async function getVaultInfo(vaultId) {
  if (vaultCache.has(vaultId)) {
    return vaultCache.get(vaultId);
  }
  
  const vault = await fireblocksService.getVaultInfo(vaultId);
  vaultCache.set(vaultId, vault);
  
  // Expire after 5 minutes
  setTimeout(() => vaultCache.delete(vaultId), 300000);
  
  return vault;
}
```

### Database Optimization

**Indexes:**
```prisma
model Token {
  @@index([userId])
  @@index([status])
  @@index([contractAddress])
}

model TokenOwnership {
  @@index([tokenId])
  @@index([investorId])
  @@index([status])
}
```

**Query Optimization:**
```javascript
// Include related data in single query
const token = await prisma.token.findUnique({
  where: { id: tokenId },
  include: {
    user: {
      include: {
        didMetadata: true
      }
    },
    ownerships: {
      where: { status: 'COMPLETED' }
    }
  }
});
```

---

## 📚 Additional Resources

### Documentation Files

**Core Documentation:**
- `backend/guide/services/TOKEN_SERVICE.md` - Token service guide
- `backend/guide/services/FIREBLOCKS_SERVICE.md` - Fireblocks integration
- `backend/guide/services/TOKEN_PURCHASE_SERVICE.md` - Purchase flow
- `backend/guide/controllers/TOKEN_CONTROLLER.md` - API endpoints

**Setup Guides:**
- `docs/setup/FIREBLOCKS_INTEGRATION.md` - Fireblocks setup
- `docs/setup/FIREBLOCKS_TOKEN_DEPLOYMENT_TROUBLESHOOTING.md` - Troubleshooting
- `docs/fireblocks-whitelisting-guide.md` - Contract whitelisting

**Flow Documentation:**
- `docs/flows/TOKEN_MINTING_REQUEST_FLOW.md` - Minting process
- `docs/flows/TOKEN_BALANCE_FLOW.md` - Balance calculation

### Test Scripts

**Standalone Tests:**
- `backend/tokenization-test/fireblocks-token-creation.js` - Direct API test

### External Resources

**Fireblocks:**
- [Fireblocks API Documentation](https://developers.fireblocks.com/)
- [Fireblocks SDK (TypeScript)](https://github.com/fireblocks/ts-sdk)
- [Fireblocks Console](https://console.fireblocks.io/)

**Blockchain:**
- [Ethereum Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Explorer](https://sepolia.etherscan.io/)
- [ERC-20 Standard](https://eips.ethereum.org/EIPS/eip-20)

**IPFS:**
- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Gateway](https://gateway.pinata.cloud/)

---

## 🎯 Quick Start Checklist

### For New Projects

- [ ] Set up Fireblocks account (Sandbox for testing)
- [ ] Generate API key and download secret key
- [ ] Create vault 88 as gas vault
- [ ] Fund vault 88 with testnet ETH (0.5 ETH minimum)
- [ ] Configure TAP policy for tokenization
- [ ] Upload contract template to Fireblocks
- [ ] Set environment variables in `.env`
- [ ] Install dependencies: `npm install`
- [ ] Run database migrations: `npx prisma migrate dev`
- [ ] Test Fireblocks connection
- [ ] Create test user accounts (admin, issuer, investor)
- [ ] Test token deployment flow
- [ ] Test token purchase flow
- [ ] Verify VC generation
- [ ] Check IPFS uploads
- [ ] Monitor gas usage
- [ ] Set up error alerts

### Environment Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Fireblocks credentials

# 4. Setup database
npx prisma migrate dev
npx prisma generate

# 5. Start server
npm run dev

# 6. Test connection
curl http://localhost:5000/api/vault/test-connection
```

---

## 📝 Summary

This tokenization engine provides a complete, production-ready solution for:

✅ **Token Deployment** - Deploy ERC-20/721/1155 tokens on multiple chains  
✅ **Vault Management** - Automated vault creation and management  
✅ **Gas Handling** - Centralized gas vault with automatic funding  
✅ **Token Transfers** - Secure transfers with transaction monitoring  
✅ **Ownership Tracking** - Database-backed ownership records  
✅ **Verifiable Credentials** - Automatic VC generation and IPFS storage  
✅ **Admin Approval** - Controlled minting workflow  
✅ **Multi-Network** - Support for 8+ EVM networks  
✅ **Error Handling** - Comprehensive error handling and recovery  
✅ **Security** - Best practices for API keys, vaults, and transactions  

**Key Files to Extract:**
1. `backend/services/tokenService.js` - Core deployment logic
2. `backend/services/fireblocks.service.js` - Fireblocks wrapper
3. `backend/services/tokenPurchaseService.js` - Transfer & VC logic
4. `backend/controllers/token.controller.js` - API endpoints
5. `backend/controllers/adminMintingRequest.controller.js` - Admin flow
6. `backend/tokenization-test/fireblocks-token-creation.js` - Test script
7. `backend/prisma/schema.prisma` - Database schema

**Next Steps:**
1. Review this documentation
2. Check the file paths listed above
3. Extract the code files you need
4. Adapt to your project structure
5. Configure Fireblocks credentials
6. Test on testnet first
7. Deploy to production

---

**Document Version**: 1.0  
**Last Updated**: December 26, 2025  
**Maintained By**: COPYm Platform Team  
**Contact**: For questions about this implementation

