import mysql from "mysql2/promise";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guildId = params.id;
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    const [rows] = await connection.execute(
      `SELECT premium FROM guilds WHERE guild_id = ? LIMIT 1`,
      [guildId]
    );
    await connection.end();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }
    const premium = !!rows[0].premium;
    // If premium, unlock all features
    const allFeatures = {
      premium_members: true,
      reaction_roles: true,
      custom_groups: true,
      embeded_messages: true,
      custom_commands: true,
      creator_alerts: true,
      esx: true,
      qbcore: true,
      // add more features as needed
    };
    const features = premium ? allFeatures : {
      premium_members: false,
      reaction_roles: false,
      custom_groups: false,
      embeded_messages: false,
      custom_commands: false,
      creator_alerts: false,
      esx: false,
      qbcore: false,
      // add more features as needed
    };
    return NextResponse.json({
      guildId,
      features,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
