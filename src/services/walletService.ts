import { pool } from '../db.js';

export type TopupInput = {
    walletId: number;
    amount: number;
    referenceId: string;
    note?:string | undefined
}

type WalletMeta = {
  walletId: number;
  userId: number;
  asset: { code: string; name: string };
};

async function getWalletMetaTx(client: any, walletId: number): Promise<WalletMeta> {

  const r = await client.query(
    `SELECT
       w.id AS wallet_id,
       w.user_id,
       a.code AS asset_code,
       a.name AS asset_name
     FROM wallets w
     JOIN asset_types a ON a.id = w.asset_type_id
     WHERE w.id = $1`,
    [walletId]
  );

  if (r.rowCount === 0) throw new Error("Wallet not found");

  const row = r.rows[0];
  return {
    walletId: Number(row.wallet_id),
    userId: Number(row.user_id),
    asset: { code: String(row.asset_code), name: String(row.asset_name) },
  };
}

export async function getWalletMeta(walletId: number): Promise<WalletMeta> {

  if (!Number.isInteger(walletId) || walletId <= 0) throw new Error("Invalid walletId");

  const r = await pool.query(
    `SELECT
       w.id AS wallet_id,
       w.user_id,
       a.code AS asset_code,
       a.name AS asset_name
     FROM wallets w
     JOIN asset_types a ON a.id = w.asset_type_id
     WHERE w.id = $1`,
    [walletId]
  );

  if (r.rowCount === 0) throw new Error("Wallet not found");

  const row = r.rows[0];

  return {
    walletId: Number(row.wallet_id),
    userId: Number(row.user_id),
    asset: { code: String(row.asset_code), name: String(row.asset_name) },
  };
}

export async function getWalletBalance(walletId: number) {
  if (!Number.isInteger(walletId) || walletId <= 0) throw new Error("Invalid walletId");

  const w = await pool.query(`SELECT id FROM wallets WHERE id = $1`, [walletId]);

  if (w.rowCount === 0) throw new Error("Wallet not found");

  await pool.query(
    `INSERT INTO wallet_balances (wallet_id, balance)
     VALUES ($1, 0)
     ON CONFLICT (wallet_id) DO NOTHING`,
    [walletId]
  );

  const bal = await pool.query(
    `SELECT balance::bigint AS balance
     FROM wallet_balances
     WHERE wallet_id = $1`,
    [walletId]
  );

  return { walletId, balance: Number(bal.rows[0].balance) };
}

export async function topupWallet(input: TopupInput){

  const { walletId, amount, referenceId, note } = input;

  if (!Number.isInteger(walletId) || walletId <= 0) {
    throw new Error("Invalid walletId");
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }
  if (!referenceId || referenceId.trim().length < 3) {
    throw new Error("referenceId is required");
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const w = await client.query(
      `SELECT id FROM wallets WHERE id = $1 FOR UPDATE`,
      [walletId]
    );

    await client.query(
        `INSERT INTO wallet_balances (wallet_id, balance)
        VALUES ($1, 0)
        ON CONFLICT (wallet_id) DO NOTHING`,
        [walletId]
    );

    const meta = await getWalletMetaTx(client, walletId);

    if (w.rowCount === 0) {
      throw new Error("Wallet is not found");
    }

    const existing = await client.query(
      `SELECT id FROM ledger_entries
       WHERE wallet_id = $1 AND reference_id = $2
       LIMIT 1`,
      [walletId, referenceId]
    );

    if ((existing?.rowCount ?? 0) > 0) {
        const bal = await client.query(
            `SELECT balance::bigint AS balance FROM wallet_balances WHERE wallet_id = $1`,
            [walletId]
        );

      await client.query("COMMIT");
      return {
        transaction: "Failed due to idempotency",
        idempotent: true,
        ...meta,
        walletId,
        balance: Number(bal.rows[0].balance),
      };
    }

    await client.query(
      `INSERT INTO ledger_entries (wallet_id, entry_type, amount, reference_id, note)
       VALUES ($1, 'TOPUP', $2, $3, $4)`,
      [walletId, amount, referenceId, note ?? null]
    );

    await client.query(
        `UPDATE wallet_balances
        SET balance = balance + $2, updated_at = NOW()
        WHERE wallet_id = $1`,
        [walletId, amount]
    );

    const bal = await client.query(
        `SELECT balance::bigint AS balance FROM wallet_balances WHERE wallet_id = $1`,
        [walletId]
    );

    await client.query("COMMIT");

    return {
      idempotent: false,
      ...meta,
      walletId,
      balance: Number(bal.rows[0].balance),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type SpendInput = {
  walletId: number;
  amount: number;
  referenceId: string; 
  note?: string | undefined;
};

export async function spendFromWallet(input: SpendInput) {
  const { walletId, amount, referenceId, note } = input;

  if (!Number.isInteger(walletId) || walletId <= 0) {
    throw new Error("Invalid walletId");
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("amount must be a positive integer");
  }
  if (!referenceId || referenceId.trim().length < 3) {
    throw new Error("referenceId is required");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const w = await client.query(
      `SELECT id FROM wallets WHERE id = $1 FOR UPDATE`,
      [walletId]
    );

    if (w.rowCount === 0) {
      throw new Error("Wallet not found");
    }

    await client.query(
        `INSERT INTO wallet_balances (wallet_id, balance)
        VALUES ($1, 0)
        ON CONFLICT (wallet_id) DO NOTHING`,
        [walletId]
    );

    const meta = await getWalletMetaTx(client, walletId);

    //
    const existing = await client.query(
      `SELECT id FROM ledger_entries
       WHERE wallet_id = $1 AND reference_id = $2
       LIMIT 1`,
      [walletId, referenceId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      const bal = await client.query(
        `SELECT balance::bigint AS balance
        FROM wallet_balances
        WHERE wallet_id = $1`,
        [walletId]
      );

      await client.query("COMMIT");
      return {
        idempotent: true,
        transaction: "Failed due to idempotency",
        ...meta,
        walletId,
        balance: Number(bal.rows[0].balance),
      };
    }

    const balBefore = await client.query(
        `SELECT balance::bigint AS balance
        FROM wallet_balances
        WHERE wallet_id = $1
        FOR UPDATE`,
        [walletId]
    );
    const currentBalance = Number(balBefore.rows[0].balance);

    if (currentBalance < amount) {
      throw new Error("Insufficient balance");
    }

    await client.query(
      `INSERT INTO ledger_entries (wallet_id, entry_type, amount, reference_id, note)
       VALUES ($1, 'SPEND', $2, $3, $4)`,
      [walletId, -amount, referenceId, note ?? null]
    );

    await client.query(
        `UPDATE wallet_balances
        SET balance = balance - $2, updated_at = NOW()
        WHERE wallet_id = $1`,
        [walletId, amount]
    );

    const balAfter = await client.query(
        `SELECT balance::bigint AS balance
        FROM wallet_balances
        WHERE wallet_id = $1`,
        [walletId]
    );

    await client.query("COMMIT");

    return {
      idempotent: false,
      ...meta,
      walletId,
      balance: Number(balAfter.rows[0].balance),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type BonusInput = {
  walletId: number;
  amount: number;
  referenceId: string; 
  note?: string | undefined;
};

export async function bonusWallet(input: BonusInput) {
  const { walletId, amount, referenceId, note } = input;

  if (!Number.isInteger(walletId) || walletId <= 0) throw new Error("Invalid walletId");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("amount must be a positive integer");
  if (!referenceId || referenceId.trim().length < 3) throw new Error("referenceId is required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const w = await client.query(
      `SELECT id FROM wallets WHERE id = $1 FOR UPDATE`,
      [walletId]
    );

    if (w.rowCount === 0) throw new Error("Wallet not found");

    await client.query(
        `INSERT INTO wallet_balances (wallet_id, balance)
        VALUES ($1, 0)
        ON CONFLICT (wallet_id) DO NOTHING`,
        [walletId]
    );

    const meta = await getWalletMetaTx(client, walletId);

    const existing = await client.query(
      `SELECT id FROM ledger_entries
       WHERE wallet_id = $1 AND reference_id = $2
       LIMIT 1`,
      [walletId, referenceId]
    );

    if ((existing.rowCount ?? 0) > 0) {
      const bal = await client.query(
        `SELECT balance::bigint AS balance
        FROM wallet_balances
        WHERE wallet_id = $1`,
        [walletId]
      );
      await client.query("COMMIT");
      return { 
        idempotent: true, 
        transaction: "Failed due to idempotency",
        ...meta, 
        walletId, 
        balance: Number(bal.rows[0].balance) 
      };
    }

    await client.query(
      `INSERT INTO ledger_entries (wallet_id, entry_type, amount, reference_id, note)
       VALUES ($1, 'BONUS', $2, $3, $4)`,
      [walletId, amount, referenceId, note ?? null]
    );

    await client.query(
        `UPDATE wallet_balances
        SET balance = balance + $2, updated_at = NOW()
        WHERE wallet_id = $1`,
        [walletId, amount]
    );

    const bal = await client.query(
        `SELECT balance::bigint AS balance
        FROM wallet_balances
        WHERE wallet_id = $1`,
        [walletId]
    );

    await client.query("COMMIT");
    return { idempotent: false, ...meta, walletId, balance: Number(bal.rows[0].balance) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
