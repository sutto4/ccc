
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

export const GET = withAuth(async (req, { auth }) => {
  try {
    // Check if user is admin
    if (auth?.role !== 'admin' && auth?.role !== 'owner') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all guilds with status information
    const rows = await query(
      `SELECT guild_id, guild_name, premium, status, created_at, updated_at 
       FROM guilds 
       ORDER BY guild_name`
    );

    // Transform the data
    let guilds = rows;
    if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])) {
      guilds = rows[0];
    }

    const transformedGuilds = guilds.map((row: any) => ({
      guild_id: row.guild_id,
      guild_name: row.guild_name,
      premium: Boolean(row.premium),
      status: row.status || 'active', // Default to 'active' if status is NULL
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({ guilds: transformedGuilds });

  } catch (error) {
    console.error('[ADMIN-GUILDS] Error fetching guilds:', error);
    return NextResponse.json({ 
      error: "Failed to fetch guilds",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});
