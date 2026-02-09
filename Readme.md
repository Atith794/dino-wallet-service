# Dino Ventures – Internal Wallet Service (Backend Assignment)

## Overview
This project implements a high-integrity **internal wallet service** similar to what you would use in a gaming platform or loyalty rewards system.

It manages virtual assets (e.g., **Gold Coins**, **Diamonds**) in a closed-loop system, ensuring that:

1. Balances are always correct  
2. No transaction is lost or duplicated  
3. Balances never go negative  
4. The system remains safe under concurrent access  

The design prioritizes **correctness, auditability, and concurrency safety**.

## Live Deployment
Base URL: https://dino-wallet-service.onrender.com

## Tech Stack
- **Node.js + TypeScript**
- **Express.js** – REST API framework
- **PostgreSQL** – ACID-compliant relational database
- **node-postgres (pg)** – database client
- **Zod** – request validation
- **Helmet / CORS / Rate limiting** – basic API hardening

---

## Why PostgreSQL?
- Strong transactional guarantees (ACID)
- Row-level locking (`SELECT ... FOR UPDATE`) for concurrency control
- Native support for constraints and idempotency keys

---

## High-Level Design

### 1) Wallet & Asset Model
- Each user can have **multiple wallets**
- Each wallet is tied to **exactly one asset type** (e.g., GOLD or DIAMOND)
- A wallet is the unit of **balance** and **concurrency control**

### 2) Ledger-Based Accounting (Source of Truth)
All balance changes are recorded in an **append-only ledger**:
- Credits → positive amounts
- Debits → negative amounts

Ledger entries are never mutated. This provides:
- Full auditability
- Replayability
- Protection against silent data corruption

### 3) Cached Balance Projection (Fast Reads)
To avoid expensive `SUM()` over large ledgers, the service maintains a cached balance projection in `wallet_balances`.

- `wallet_balances` is updated **transactionally** with every ledger insert
- Ledger remains the source of truth
- Balances can be rebuilt from ledger using a backfill script

This hybrid approach provides:
- Fast balance reads (O(1))
- Strong consistency
- Rebuild capability if needed

---

## Database Schema (Conceptual)
- `asset_types` – GOLD, DIAMOND, etc.
- `users` – includes SYSTEM users (e.g., Treasury)
- `wallets` – one per (user, asset)
- `ledger_entries` – append-only transaction log
- `wallet_balances` – cached current balance per wallet

---

## API Endpoints

### Wallet Operations

#### Top-up (Purchase)
`POST /wallets/:walletId/topup`  
Credits a wallet after a successful payment.

#### Bonus / Incentive
`POST /wallets/:walletId/bonus`  
Issues free credits (referrals, promotions, etc.).

#### Spend
`POST /wallets/:walletId/spend`  
Debits credits from a wallet. Fails if balance would go negative.

#### Get Balance
`GET /wallets/:walletId/balance`  
Returns the current cached balance.

### Wallet Metadata
`GET /wallets/:walletId`  
Returns wallet owner and asset information.

## API Testing (Postman)
A Postman collection is included in the repository: 'postman/dino-wallet-service.postman_collection.json'

Postman Setup:

1. Import the Postman collection from /postman folder
2. Create a Postman environment with:
   - baseUrl = https://dino-wallet-service.onrender.com
   - walletId = <any valid wallet id> (Set it as 3,4,5 or 6, because 3,4 points to wallets of first user and 5,6 points to wallets of second user. Choose anyone among them.)
3. Select the environment and run the collection

## Concurrency Strategy
- Each modifying operation runs inside a **database transaction**
- The wallet row is locked using:

SELECT id FROM wallets WHERE id = $1 FOR UPDATE;

This guarantees serialized updates per wallet and prevents race conditions such as:
 - double-spends
 - lost updates
Transactions are intentionally short-lived to reduce contention.

## Idempotency Strategy

To handle retries safely (e.g., network failures):
  - Each TOPUP / BONUS / SPEND request includes a referenceId
  - A unique constraint enforces uniqueness on: (wallet_id, reference_id) (where reference_id is not null)

If the same request is retried:
  - the service detects the existing ledger entry
  - no duplicate balance change is applied
  - the current balance is returned

This ensures exactly-once semantics for retries.

## Balance Cache Safety

wallet_balances rows are created using:

INSERT ... ON CONFLICT DO NOTHING;

This makes the system self-healing:
  - missing balance rows are automatically created
  - avoids race-condition-prone existence checks

Cached balance is always updated in the same transaction as the ledger entry.

## Data Seeding

A seed script initializes:

  - Asset types (Gold, Diamonds)
  - System account (Treasury)
  - Two users with initial balances

All initial balances are inserted via ledger entries (not direct balance writes).

## Running Locally (without Docker)

Pre-requisites:
  - Node.js
  - PostgreSQL (local)

Steps:
Run the commands: 
  - npm install
  - npm run dev

## Create schema + seed data

Database name: project_dino

  - psql -U postgres -d project_dino -f db/schema.sql
  - psql -U postgres -d project_dino -f db/seed.sql
  - psql -U postgres -d project_dino -f db/backfill_wallet_balances.sql

## Running with Docker (Local)

If you are using Docker locally:
Run the command: 
  - docker compose up --build

If you update schema/seed and want a fresh DB:
Run the commands: 
  - docker compose down -v
  - docker compose up --build

## Deployment (Render)

  - The API is deployed as a Docker Web Service on Render.
  - Render Postgres requires SSL, so the application enables SSL in production.

After creating Render Postgres, initialize the DB using:

  - psql "$DATABASE_URL" -f db/schema.sql
  - psql "$DATABASE_URL" -f db/seed.sql
  - psql "$DATABASE_URL" -f db/backfill_wallet_balances.sql

## Future Improvements

  - Authentication & authorization (wallet ownership checks)
  - Wallet-to-wallet transfers
  - Better observability (structured logs, tracing)
  - Horizontal scaling via multiple service instances behind a load balancer

## Summary

This implementation focuses on:
  - Correctness over shortcuts
  - Auditability via ledger-first design
  - Concurrency safety under high load
  - Idempotent, retry-safe APIs