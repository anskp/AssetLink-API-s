# AssetLink Custody - UI Dashboard Guide

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open the dashboard:**
   ```
   http://localhost:3000/dashboard
   ```

## 👥 User Roles

### 🏦 Issuer (Asset Owner)
- **Link Assets**: Add physical assets to custody
- **Mint Tokens**: Tokenize linked assets
- **List Tokens**: Put minted tokens on marketplace
- **Manage Listings**: View and accept bids

### 💼 Investor (Token Buyer)
- **Browse Marketplace**: See available tokens
- **Place Bids**: Make offers on listed tokens
- **View Portfolio**: See owned assets
- **List for Resale**: Sell owned tokens

### ⚖️ Checker (Approver)
- **Review Operations**: Approve/reject mint requests
- **Governance**: Maker-checker workflow enforcement

## 📋 Complete Workflow

### For Issuers:

1. **Link an Asset**
   - Click "Link New Asset"
   - Fill in asset details (ID, type, name, value)
   - Submit for approval

2. **Mint a Token**
   - Go to "Mint / Burn" view
   - Click "Mint Token" on a linked asset
   - Enter token details (symbol, supply, blockchain)
   - Wait for checker approval

3. **List on Marketplace**
   - Go to "My Portfolio"
   - Click "List for Sale" on a minted token
   - Set price and duration
   - Token appears in marketplace

4. **Accept Bids**
   - View "My Listings" section
   - Click "View Bids" on a listing
   - Accept a bid to complete sale
   - **Ownership transfers instantly (off-chain)**

### For Investors:

1. **Browse Marketplace**
   - Switch role to "Investor"
   - Go to "Asset Marketplace"
   - See all available tokens

2. **Place a Bid**
   - Click "Place Bid" on a token
   - Enter your bid amount
   - Submit bid

3. **Wait for Acceptance**
   - Seller reviews your bid
   - If accepted, you instantly own the token
   - **No on-chain transaction needed!**

4. **Resell Your Token**
   - Go to "My Portfolio"
   - Click "List for Sale"
   - Set new price
   - Wait for buyers

## 🎯 Key Features

### ✅ Off-Chain Trading
- Tokens **never leave custody vault**
- Instant ownership transfer
- Zero gas fees
- Atomic settlement (ownership + payment)

### ✅ Maker-Checker Workflow
- Issuers initiate operations
- Checkers approve/reject
- Self-approval blocked
- Complete audit trail

### ✅ Real-Time Monitoring
- Live operation status
- Fireblocks execution logs
- Audit trail for all actions

## 🔑 Test Users

The UI simulates different users:

- **Issuer**: `user-123` (owns and lists tokens)
- **Investor**: `user-456` (buys tokens)

Switch roles using the dropdown in the sidebar.

## 📊 Views Explained

### Overview
- Global stats
- Recent activity
- System health

### Custody Records
- All linked assets
- Asset status
- Metadata

### Mint / Burn
- Token supply management
- Initiate minting
- Burn tokens

### Asset Marketplace
- Browse available tokens
- Place bids
- Purchase tokens

### My Portfolio
- Your owned assets
- List for sale
- View listings

### My Listings
- Active listings
- Received bids
- Accept/reject bids

### Approval Queue
- Pending operations
- Approve/reject requests
- Governance workflow

### Audit Trail
- Immutable logs
- All system events
- Complete history

## 🎨 UI Design

**Minimal & Clean:**
- Dark theme (#0a0a0a background)
- Simple borders (#222)
- Blue primary (#2563eb)
- No fancy animations
- Fast and responsive

## 🔧 API Integration

The UI connects to:
```
http://localhost:3000/v1
```

All marketplace endpoints are fully functional:
- `POST /marketplace/listings` - Create listing
- `GET /marketplace/listings` - Browse marketplace
- `POST /marketplace/listings/:id/bids` - Place bid
- `POST /marketplace/bids/:id/accept` - Accept bid
- `GET /marketplace/portfolio/:userId` - Get portfolio

## 💡 Tips

1. **Start as Issuer** to create and list tokens
2. **Switch to Investor** to buy them
3. **Use Checker role** to approve operations
4. **Check Audit Trail** to see all events
5. **Portfolio updates instantly** after trades

## 🎉 Demo Flow

1. Link asset (Issuer)
2. Approve link (Checker)
3. Mint token (Issuer)
4. Approve mint (Checker)
5. List token (Issuer)
6. Switch to Investor
7. Place bid (Investor)
8. Switch back to Issuer
9. Accept bid (Issuer)
10. **Trade complete!** ✅

Ownership transferred, payment settled, token still in custody vault!

---

**Built with:** Vanilla JS, Minimal CSS, Express.js, Prisma, Fireblocks (simulation mode)
