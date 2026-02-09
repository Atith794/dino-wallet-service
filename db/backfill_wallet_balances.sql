BEGIN;

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

COMMIT;
