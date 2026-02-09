-- Schema
\i db/schema.sql

-- Seed
\i db/seed.sql

-- Backfil balance
\i db/backfill_wallet_balances.sql

-- wallet_balances table
CREATE TABLE IF NOT EXISTS wallet_balances (
  wallet_id   BIGINT PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  balance     BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_balances_non_negative_chk CHECK (balance >= 0)
);

-- Backfill
INSERT INTO wallet_balances (wallet_id, balance)
SELECT w.id, 0
FROM wallets w
ON CONFLICT (wallet_id) DO NOTHING;

UPDATE wallet_balances wb
SET balance = sub.balance,
    updated_at = NOW()
FROM (
  SELECT wallet_id, COALESCE(SUM(amount), 0)::bigint AS balance
  FROM ledger_entries
  GROUP BY wallet_id
) sub
WHERE wb.wallet_id = sub.wallet_id;