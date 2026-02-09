import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const isProd = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

export async function checkDbConnection() {
  const res = await pool.query("SELECT NOW() as now");
  return res.rows[0]?.now;
}
