BEGIN;

CREATE TABLE IF NOT EXISTS wallet_balances (
  wallet_id   BIGINT PRIMARY KEY REFERENCES wallets(id) ON DELETE CASCADE,
  balance     BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_balances_non_negative_chk CHECK (balance >= 0)
);

COMMIT;
