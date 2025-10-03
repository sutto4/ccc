import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    // Determine visibility scope
    const userId = auth.user.id;
    const userRole = (auth.user as any)?.role;
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    let dbGuilds: any[] = [];

    if (isAdmin) {
      // Admins see every guild (no hard limit)
      dbGuilds = await query('SELECT * FROM guilds ORDER BY created_at DESC');
    } else {
      // Non-admins see guilds they own or have explicit access to
      // Using UNION to combine ownership and access lists, then de-duplicate by guild_id
      dbGuilds = await query(
        `SELECT g.*
         FROM guilds g
         WHERE g.owner_id = ?
         UNION
         SELECT g.*
         FROM guilds g
         INNER JOIN server_access_control s ON s.guild_id = g.guild_id AND s.has_access = 1
         WHERE s.user_id = ?
         ORDER BY created_at DESC`,
        [userId, userId]
      ) as any[];
    }

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
        limit: normalizedGuilds.length,
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
};