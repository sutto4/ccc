import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: guildId } = await params;
  try {
    // Require DB configuration
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Dynamically import the MySQL driver
    let mysql: any;
    try {
      ({ default: mysql } = await import("mysql2/promise"));
    } catch {
      return NextResponse.json({ error: "Database driver not installed. Run: pnpm add mysql2" }, { status: 500 });
    }

    const connection = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    });
    const [rows] = await connection.execute(
      `SELECT premium FROM guilds WHERE guild_id = ? LIMIT 1`,
      [guildId]
    );
    await connection.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    const first = (rows as any[])[0] as any;
    const premium = !!first?.premium;

    const features = premium
      ? { premium_members: true, reaction_roles: true, custom_groups: true, embeded_messages: true, custom_commands: true, creator_alerts: true, esx: true, qbcore: true }
      : { premium_members: false, reaction_roles: false, custom_groups: false, embeded_messages: false, custom_commands: false, creator_alerts: false, esx: false, qbcore: false };

    return NextResponse.json({ guildId, features });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
