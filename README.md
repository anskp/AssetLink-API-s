# AssetLink Custody – Canonical Folder Structure

## (Aligned with Custody, Off‑Chain Ledger, Marketplace, Listings & Ownership Math)

This folder structure reflects:
* Custody‑only responsibilities (AssetLink Custody)
* Off‑chain ownership ledger
* Marketplace listings & secondary trading
* Token math (fractions, quantities, balances)
* Maker–checker governance
* Fireblocks‑only on‑chain execution

---

## High‑Level Service Boundary

* **AssetLink Custody = Custody + Ledger + Settlement Engine**
* **Marketplace UI = consumer of these APIs**
* **Blockchain = existence layer only**

---

## Core Modules

### `ledger/` (Off‑Chain Ownership Ledger)
Tracks beneficial ownership, prevents double spending, and supports fractional ownership.

### `marketplace/` (Listings & Trading)
The settlement brain for creating listings, validating balances, and executing off-chain trades.

### `custody/` & `token-lifecycle/`
Separates vault metadata and status from mint/withdraw/burn execution.

---

## Golden Rule
* Ledger changes do not touch blockchain.
* Blockchain changes do not update ownership ledger.
* Only explicit workflows bridge them.
