import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mysql from "mysql2/promise";
import { env } from "@/lib/env";

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function isAdmin(discordId: string): Promise<boolean> {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) return false;
  const p = getPool();
  const [rows] = await p.execute(
    "SELECT role FROM users WHERE discord_id = ? LIMIT 1",
    [discordId]
  );
  if (Array.isArray(rows) && rows.length > 0) {
    const first = (rows as any[])[0] as any;
    return first?.role === "admin" || first?.role === "owner";
  }
  return false;
}

export async function upsertUser({ email, discord_id, name, role }: { email: string, discord_id: string, name: string, role?: string }) {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) return;
  const p = getPool();
  await p.execute(
    `INSERT INTO users (email, discord_id, name, role) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role=COALESCE(VALUES(role), role)`,
    [email, discord_id, name, role || null]
  );
}
