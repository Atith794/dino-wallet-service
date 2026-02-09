-- DWS - Schema
BEGIN;

-- Clean reset
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS asset_types CASCADE;
DROP TABLE IF EXISTS wallet_balances CASCADE;

-- Asset types
CREATE TABLE asset_types (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  user_type   TEXT NOT NULL DEFAULT 'USER',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_user_type_chk CHECK (user_type IN ('USER','SYSTEM'))
);

-- Wallets: One per user and asset_type
CREATE TABLE wallets (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type_id BIGINT NOT NULL REFERENCES asset_types(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallets_user_asset_uniq UNIQUE (user_id, asset_type_id)
);

-- Ledger entries (source of truth)
CREATE TABLE ledger_entries (
  id            BIGSERIAL PRIMARY KEY,
  wallet_id     BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  entry_type    TEXT NOT NULL,
  amount        BIGINT NOT NULL,
  reference_id  TEXT,         
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ledger_entry_type_chk CHECK (entry_type IN ('TOPUP','BONUS','SPEND','SEED')),
  CONSTRAINT ledger_amount_nonzero_chk CHECK (amount <> 0)
);

-- Cached wallet balances
CREATE TABLE wallet_balances (
  wallet_id   BIGINT PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  balance     BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_balances_non_negative_chk CHECK (balance >= 0)
);

CREATE INDEX wallet_balances_updated_idx ON wallet_balances(updated_at DESC);

CREATE UNIQUE INDEX ledger_wallet_reference_uniq
  ON ledger_entries(wallet_id, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX ledger_wallet_created_idx ON ledger_entries(wallet_id, created_at DESC);

COMMIT;
