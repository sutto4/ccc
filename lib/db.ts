import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mysql from "mysql2/promise";

export async function isAdmin(discordId: string): Promise<boolean> {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  const [rows] = await connection.execute(
    "SELECT role FROM users WHERE discord_id = ? LIMIT 1",
    [discordId]
  );
  await connection.end();
  if (Array.isArray(rows) && rows.length > 0) {
    return rows[0].role === "admin";
  }
  return false;
}

export async function upsertUser({ email, discord_id, name, role }: { email: string, discord_id: string, name: string, role?: string }) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await connection.execute(
    `INSERT INTO users (email, discord_id, name, role) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role=COALESCE(VALUES(role), role)`,
    [email, discord_id, name, role || null]
  );
  await connection.end();
}
