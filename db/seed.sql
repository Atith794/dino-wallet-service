BEGIN;

-- Asset Types
INSERT INTO asset_types (code, name) VALUES
  ('GOLD', 'Gold Coins'),
  ('DIAMOND', 'Diamonds')
ON CONFLICT (code) DO NOTHING;

-- Users
-- System treasury
INSERT INTO users (name, user_type) VALUES
  ('Treasury', 'SYSTEM')
RETURNING id;

-- Normal users
INSERT INTO users (name, user_type) VALUES
  ('John', 'USER'),
  ('Doe', 'USER');

-- Wallets (one per user per asset type)
-- Treasury wallets
INSERT INTO wallets (user_id, asset_type_id)
SELECT u.id, a.id
FROM users u
JOIN asset_types a ON a.code IN ('GOLD','DIAMOND')
WHERE u.name = 'Treasury'
ON CONFLICT (user_id, asset_type_id) DO NOTHING;

-- John wallets
INSERT INTO wallets (user_id, asset_type_id)
SELECT u.id, a.id
FROM users u
JOIN asset_types a ON a.code IN ('GOLD','DIAMOND')
WHERE u.name = 'John'
ON CONFLICT (user_id, asset_type_id) DO NOTHING;

-- Does wallets
INSERT INTO wallets (user_id, asset_type_id)
SELECT u.id, a.id
FROM users u
JOIN asset_types a ON a.code IN ('GOLD','DIAMOND')
WHERE u.name = 'Doe'
ON CONFLICT (user_id, asset_type_id) DO NOTHING;

-- John: 500 GOLD, 10 DIAMOND
INSERT INTO ledger_entries (wallet_id, entry_type, amount, reference_id, note)
SELECT w.id, 'SEED', 500, 'seed-John-gold', 'Initial balance'
FROM wallets w
JOIN users u ON u.id = w.user_id
JOIN asset_types a ON a.id = w.asset_type_id
WHERE u.name='John' AND a.code='GOLD'
ON CONFLICT DO NOTHING;

INSERT INTO ledger_entries (wallet_id, entry_type, amount, reference_id, note)
SELECT w.id, 'SEED', 10, 'seed-John-diamond', 'Initial balance'
FROM wallets w
JOIN users u ON u.id = w.user_id
JOIN asset_types a ON a.id = w.asset_type_id
WHERE u.name='John' AND a.code='DIAMOND'
ON CONFLICT DO NOTHING;

-- Doe: 300 GOLD, 0 DIAMOND
INSERT INTO ledger_entries (wallet_id, entry_type, amount, reference_id, note)
SELECT w.id, 'SEED', 300, 'seed-Doe-gold', 'Initial balance'
FROM wallets w
JOIN users u ON u.id = w.user_id
JOIN asset_types a ON a.id = w.asset_type_id
WHERE u.name='Doe' AND a.code='GOLD'
ON CONFLICT DO NOTHING;

COMMIT;
