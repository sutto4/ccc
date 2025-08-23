import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get guilds from database
    const dbGuildsResult = await query(
      `SELECT guild_id, guild_name, premium FROM guilds ORDER BY created_at DESC`
    );

    let dbGuilds = dbGuildsResult;
    if (Array.isArray(dbGuildsResult) && dbGuildsResult.length > 0 && Array.isArray(dbGuildsResult[0])) {
      dbGuilds = dbGuildsResult[0];
    }

    // Get guilds from Discord API (what the bot can see)
    const discordBotToken = env.DISCORD_BOT_TOKEN;
    if (!discordBotToken) {
      return NextResponse.json({ error: "Discord bot token not configured" }, { status: 500 });
    }

    const discordResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${discordBotToken}`,
      },
    });

    let discordGuilds = [];
    if (discordResponse.ok) {
      discordGuilds = await discordResponse.json();
    }

    // Check which Discord guilds are missing from database
    const dbGuildIds = (dbGuilds || []).map((g: any) => g.guild_id);
    const missingFromDb = discordGuilds.filter((g: any) => !dbGuildIds.includes(g.id));

    return NextResponse.json({
      message: "Guild comparison: Database vs Discord",
      database: {
        total: Array.isArray(dbGuilds) ? dbGuilds.length : 0,
        guilds: dbGuilds || []
      },
      discord: {
        total: discordGuilds.length,
        guilds: discordGuilds
      },
      missingFromDatabase: missingFromDb,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debug discord guilds endpoint:', error);
    return NextResponse.json({ 
      error: "Failed to get guild comparison",
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}

