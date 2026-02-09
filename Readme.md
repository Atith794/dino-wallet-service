Dino Ventures – Internal Wallet Service (Backend Assignment)
Overview

This project implements a high-integrity internal wallet service similar to what would be used in a gaming platform or loyalty rewards system.
The service manages virtual assets (e.g. Gold Coins, Diamonds) in a closed-loop system, ensuring that:

1. balances are always correct

2. no transaction is lost or duplicated

3. balances never go negative

4. the system remains safe under concurrent access

The design prioritizes correctness, auditability, and concurrency safety.

Tech Stack

1. Node.js + TypeScript

2. Express.js – REST API framework

3. PostgreSQL – ACID-compliant relational database

4. node-postgres (pg) – database client

Why PostgreSQL?

1. Strong transactional guarantees (ACID)

2. Row-level locking (SELECT … FOR UPDATE) for concurrency control

3. Native support for constraints and idempotency keys

High-Level Design:

1. Wallet & Asset Model:

Each user can have multiple wallets.

Each wallet is tied to exactly one asset type (e.g. GOLD or DIAMOND).

A wallet is the unit of balance and concurrency control.

User ──┬── Wallet (GOLD)
       └── Wallet (DIAMOND)

2. Ledger-Based Accounting (Source of Truth):

All balance changes are recorded in a ledger table:

Credits → positive amounts

Debits → negative amounts

Ledger entries are append-only and never mutated.

This provides:

Full auditability

Replayability

Protection against silent data corruption

3. Cached Balance Projection:

To avoid expensive SUM() operations on large ledgers, the system maintains a cached balance projection:

Stored in wallet_balances

Updated transactionally with every ledger insert

Ledger remains the source of truth

This hybrid approach provides:

Fast balance reads (O(1))

Strong consistency

Ability to rebuild balances from ledger if required

Database Schema (Conceptual)

asset_types – GOLD, DIAMOND, etc.

users – includes SYSTEM users (e.g. Treasury)

wallets – one per (user, asset)

ledger_entries – append-only transaction log

wallet_balances – cached current balance per wallet

API Endpoints
Wallet Operations
Top-up (Purchase)
POST /wallets/:walletId/topup


Credits a wallet after a successful payment.

Bonus / Incentive
POST /wallets/:walletId/bonus


Issues free credits (referrals, promotions, etc.).

Spend
POST /wallets/:walletId/spend


Debits credits from a wallet.
Fails if balance would go negative.

Get Balance
GET /wallets/:walletId/balance


Returns current cached balance.

Wallet Metadata
GET /wallets/:walletId


Returns wallet owner and asset information.

Concurrency Strategy

Each modifying operation runs inside a database transaction

The wallet row is locked using:

SELECT … FROM wallets WHERE id = ? FOR UPDATE


This guarantees serialized updates per wallet

Prevents race conditions such as double-spends or lost updates

Transactions are intentionally short-lived to reduce contention.

Idempotency Strategy

To handle retries safely (e.g. network failures):

Each TOPUP / BONUS / SPEND request includes a referenceId

A unique constraint enforces:

(wallet_id, reference_id)


If the same request is retried:

the service detects the existing ledger entry

no duplicate balance change is applied

the current balance is returned

This ensures exactly-once semantics.

Balance Cache Safety

wallet_balances rows are created using:

INSERT … ON CONFLICT DO NOTHING


This makes the system self-healing:

missing balance rows are automatically created

avoids race-condition-prone existence checks

Cached balance is always updated in the same transaction as the ledger entry

Data Seeding:-

A seed script initializes:

Asset types (Gold, Diamonds)

System account (Treasury)

Two users with initial balances

All initial balances are inserted via ledger entries, not direct balance writes

How to Run Locally?

Prerequisites:

Node.js

PostgreSQL (local)

Steps:
npm install
npm run dev


Run schema and seed scripts:

psql -U postgres -d dino_wallet -f db/schema.sql
psql -U postgres -d dino_wallet -f db/seed.sql

Future Improvements (Out of Scope)

Dockerfile & docker-compose for containerized setup

Authentication & authorization

Wallet-to-wallet transfers

Event-driven projections

Horizontal scaling via partitioned ledgers

Summary:-

This implementation focuses on:

1) Correctness over shortcuts

2) Auditability via ledger-first design

3) Concurrency safety under high load

4) Idempotent, retry-safe APIs