
import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";
// Node fetch is available in Next.js API routes

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API_BASE = "https://discord.com/api/v10";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Fetch relevant columns from the 'guilds' table
    // Fetch all guilds
    const guilds = await query(`
      SELECT 
        guild_id, 
        guild_name, 
        created_at, 
        updated_at,
        premium
      FROM guilds
    `);

    // For each guild, fetch member/role counts and premium status
    const withCounts = await Promise.all(
      (Array.isArray(guilds) ? guilds : []).map(async (g: any) => {
        // Fetch from Discord API
        let member_count = null;
        let role_count = null;
        let guild_icon_url = null;
        if (g.guild_id && DISCORD_BOT_TOKEN) {
          try {
            // Fetch guild info for icon and member count
            const resp = await fetch(`${DISCORD_API_BASE}/guilds/${g.guild_id}`,
              { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } });
            if (resp.ok) {
              const data = await resp.json();
              if (data.icon) {
                guild_icon_url = `https://cdn.discordapp.com/icons/${g.guild_id}/${data.icon}.png`;
              }
              if (typeof data.approximate_member_count === "number") {
                member_count = data.approximate_member_count;
              }
            }
            // Fetch roles for role count
            const rolesResp = await fetch(`${DISCORD_API_BASE}/guilds/${g.guild_id}/roles`, {
              headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
            });
            if (rolesResp.ok) {
              const rolesData = await rolesResp.json();
              if (Array.isArray(rolesData)) {
                role_count = rolesData.length;
              }
            }
          } catch (e) { /* ignore */ }
        }

        return {
          ...g,
          member_count,
          role_count,
          premium: !!g.premium,
          guild_icon_url,
        };
      })
    );
    res.status(200).json(withCounts);
  } catch (error) {
    console.error("Error fetching guilds:", error);
    res.status(500).json({ error: "Failed to fetch guilds" });
  }
}
