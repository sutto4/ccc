
export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    // Example: Adjust these queries to match your schema
    // This assumes columns: guild_id, guild_name, guild_icon, member_count, role_count
    const [rows] = await connection.execute(`
      SELECT 
        g.guild_id,
        g.guild_name,
        g.created_at,
        g.premium
      FROM guilds g
    `);

    await connection.end();

    // Fetch details from Discord API for each guild
    const discordBotToken = process.env.DISCORD_BOT_TOKEN;
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
        // Fetch owner user from Discord API
        console.log(`[admin/guilds] Fetching owner for guild ${g.guild_id} (owner_id: ${discord.owner_id})`);
        const res = await fetch(`https://discord.com/api/v10/users/${discord.owner_id}`, {
          headers: {
            Authorization: `Bot ${discordBotToken}`,
          },
        });
        console.log(`[admin/guilds] Discord API user fetch status:`, res.status);
        if (res.ok) {
          const owner = await res.json();
          console.log(`[admin/guilds] Owner API response:`, owner);
          owner_name = owner.global_name || owner.username || null;
        } else {
          const errText = await res.text();
          console.error(`[admin/guilds] Failed to fetch owner for guild ${g.guild_id}:`, errText);
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
import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
