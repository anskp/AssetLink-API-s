# Sprint 5 Guide: Fireblocks Integration & Transaction Execution

## Overview
Sprint 5 marks the transition from mock operations to real-world custody execution. We have integrated the **Fireblocks SDK** to handle vault management, token issuance (minting), and asset transfers.

## Core Services

### 1. Fireblocks Service (`src/modules/vault/fireblocks.service.js`)
A wrapper around the `@fireblocks/ts-sdk` that provides:
- **Vault Management**: `createUserVault()` to provision secure multi-party computation (MPC) vaults.
- **Wallet Infrastructure**: `getWalletAddress()` to generate deposit addresses for specific assets.
- **Tokenization**: `issueToken()` to deploy and mint new tokens using Fireblocks' tokenization engine.
- **Transfers**: `transferTokens()` for secure vault-to-vault asset movements.

### 2. Operation Execution Flow
The `OperationService` now bridges the Maker-Checker workflow with real execution:
1. **Approval**: Once a Checker approves an operation, `executeOperation()` is triggered.
2. **Submission**: The operation payload is dispatched to Fireblocks.
3. **Monitoring**: The system enters a polling loop (`monitorExecution`) to track the task status until it reaches a terminal state (`COMPLETED` or `FAILED`).
4. **Finalization**: Upon confirmation, the `CustodyRecord` is updated with the real `txHash` and on-chain details.

## Configuration
Requires the following environment variables in `.env`:
- `FIREBLOCKS_API_KEY`: Your Fireblocks API user key.
- `FIREBLOCKS_SECRET_KEY_PATH`: Path to your `.pem` secret file.
- `FIREBLOCKS_BASE_URL`: Defaults to `https://sandbox-api.fireblocks.io/v1`.
- `FIREBLOCKS_CONTRACT_TEMPLATE_ID`: The ID of the contract template uploaded to Fireblocks.

## Monitoring & Lifecycle
Since blockchain transactions are asynchronous, operations go through an additional "On-Chain Processing" phase. 

### Status Transitions:
- `PENDING_CHECKER` -> `APPROVED` -> `EXECUTED` (Submitted to FB) -> `COMPLETED` (Confirmed on-chain).

## Security Note
Fireblocks MPC-CMP protocol ensures that private keys are never handled in raw format by our servers, providing institutional-grade security for the Custody Layer.
