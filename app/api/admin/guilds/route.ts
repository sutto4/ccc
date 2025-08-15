
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAdmin } from "@/lib/db";
import mysql from "mysql2/promise";

export async function GET() {
  try {
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }
    const connection = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    });

    const [rows] = await connection.execute(`
      SELECT 
        g.guild_id,
        g.guild_name,
        g.created_at,
        g.premium
      FROM guilds g
    `);

    await connection.end();

    const discordBotToken = env.DISCORD_BOT_TOKEN;
    async function fetchDiscordGuild(guild_id: string) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guild_id}?with_counts=true`, {
        headers: {
          Authorization: `Bot ${discordBotToken}`,
        },
      });
      if (!res.ok) return null;
      return res.json();
    }

    const guilds = await Promise.all((rows as any[]).map(async g => {
      const discord = await fetchDiscordGuild(g.guild_id);
      let owner_name = null;
      if (discord?.owner_id) {
        const res = await fetch(`https://discord.com/api/v10/users/${discord.owner_id}`, {
          headers: { Authorization: `Bot ${discordBotToken}` },
        });
        if (res.ok) {
          const owner = await res.json();
          owner_name = owner.global_name || owner.username || null;
        }
      }
      return {
        ...g,
        premium: !!g.premium,
        owner_name,
        guild_icon_url: discord?.icon
          ? `https://cdn.discordapp.com/icons/${g.guild_id}/${discord.icon}.png`
          : "/placeholder-logo.png",
        member_count: discord?.approximate_member_count ?? null,
        role_count: discord?.roles?.length ?? null,
      };
    }));

    return NextResponse.json(guilds);
  } catch (error: any) {
    console.error("[API /admin/guilds]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
