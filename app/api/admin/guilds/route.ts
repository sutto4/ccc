
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { getGuildsForUser } from "@/lib/guilds-server";

export const GET = withAuth(async (_req, _params, auth) => {
  try {
    // Check if user is admin
    if (auth?.role !== 'admin' && auth?.role !== 'owner') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all guilds with status information from admin DB
    const rows = await query(
      `SELECT guild_id, guild_name, premium, status, created_at, updated_at 
       FROM guilds 
       ORDER BY guild_name`
    );

    // Transform the data
    let guilds = rows as any;
    if (Array.isArray(rows) && rows.length > 0 && Array.isArray((rows as any)[0])) {
      guilds = (rows as any)[0];
    }

    let transformedGuilds = (guilds as any[]).map((row: any) => ({
      guild_id: row.guild_id,
      guild_name: row.guild_name,
      premium: Boolean(row.premium),
      status: row.status || 'active', // Default to 'active' if status is NULL
      created_at: row.created_at,
      updated_at: row.updated_at,
      icon_url: null as string | null,
    }));

    // Enrich with normalized guild data (names and icons) from the existing helper
    try {
      const normalizedGuilds = await getGuildsForUser(auth.accessToken);
      const guildMap = new Map();
      
      // Create a map of normalized guild data by guild_id
      for (const guild of normalizedGuilds) {
        if (guild.id) {
          guildMap.set(guild.id, {
            name: guild.name,
            iconUrl: guild.iconUrl
          });
        }
      }

      // Merge the normalized data with admin data
      transformedGuilds = transformedGuilds.map(g => {
        const normalized = guildMap.get(g.guild_id);
        return {
          ...g,
          guild_name: normalized?.name || g.guild_name || 'Unknown Server',
          icon_url: normalized?.iconUrl || g.icon_url
        };
      });
    } catch (error) {
      console.warn('[ADMIN-GUILDS] Failed to enrich with normalized data:', error);
      
      // Fallback: Generate Discord icon URLs from guild IDs if we have them
      transformedGuilds = transformedGuilds.map(g => {
        // Generate a default Discord avatar based on guild ID (this will always work)
        const defaultAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(g.guild_id) % 5}.png?size=64`;
        
        return {
          ...g,
          guild_name: g.guild_name || `Server ${g.guild_id.slice(-4)}`, // Use last 4 chars of ID as fallback name
          icon_url: defaultAvatarUrl
        };
      });
      
      // Also try to fetch guild info directly from Discord API for better names
      if (auth.accessToken) {
        console.log('[ADMIN-GUILDS] Attempting to fetch guild info from Discord API');
        for (const guild of transformedGuilds) {
          try {
            const response = await fetch(`https://discord.com/api/v10/guilds/${guild.guild_id}`, {
              headers: {
                'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const guildData = await response.json();
              if (guildData.name) {
                guild.guild_name = guildData.name;
                if (guildData.icon) {
                  guild.icon_url = `https://cdn.discordapp.com/icons/${guild.guild_id}/${guildData.icon}.png?size=64`;
                }
                console.log(`[ADMIN-GUILDS] Updated guild ${guild.guild_id}: name="${guild.guild_name}", icon="${guild.icon_url}"`);
              }
            }
          } catch (error) {
            console.warn(`[ADMIN-GUILDS] Failed to fetch guild ${guild.guild_id} from Discord API:`, error);
          }
        }
      }
    }

    return NextResponse.json({ guilds: transformedGuilds });

  } catch (error) {
    console.error('[ADMIN-GUILDS] Error fetching guilds:', error);
    return NextResponse.json({ 
      error: "Failed to fetch guilds",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
