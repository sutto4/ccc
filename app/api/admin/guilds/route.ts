import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { AuthMiddleware } from '@/lib/auth-middleware';

export const GET = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    // Get basic guild data from database
    const dbGuilds = await query('SELECT * FROM guilds ORDER BY created_at DESC LIMIT 50');

    // Return database data with stored icon URLs
    const normalizedGuilds = (dbGuilds as any[]).map((guild: any) => {
      return {
        ...guild,
        // Normalize column names for frontend
        name: guild.name || guild.guild_name,
        guild_name: guild.name || guild.guild_name,
        // Use stored icon URL from database
        icon_url: guild.icon_url || null
      };
    });

    return NextResponse.json({
      guilds: normalizedGuilds,
      pagination: {
        total: normalizedGuilds.length,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('[ADMIN-GUILDS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guilds' },
      { status: 500 }
    );
  }
});