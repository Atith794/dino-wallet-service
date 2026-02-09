import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

export const pool = new Pool({
  connectionString,
  ssl: false,
});

export async function checkDbConnection() {
  const res = await pool.query("SELECT NOW() as now");
  return res.rows[0]?.now;
}
