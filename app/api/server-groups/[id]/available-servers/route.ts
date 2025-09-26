import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authz';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (auth) => {
    try {
      const { id } = await params;
      const userId = auth.discordId || '351321199059533826'; // Fallback for debugging

      // Get servers that the user has access to but are not in any group
      const availableServers = await query(`
        SELECT 
          g.guild_id,
          g.guild_name,
          g.member_count,
          g.icon_url,
          1 as is_online
        FROM guilds g
        JOIN server_access_control sac ON g.guild_id = sac.guild_id
        LEFT JOIN server_group_members sgm ON g.guild_id = sgm.guild_id
        WHERE sac.user_id = ? 
          AND sac.has_access = 1 
          AND sgm.guild_id IS NULL
        ORDER BY g.guild_name ASC
      `, [userId]);

      console.log('[AVAILABLE-SERVERS] Found servers:', availableServers.length);

      return NextResponse.json({ servers: availableServers });

    } catch (error) {
      console.error('[SERVER-GROUPS] Error fetching available servers:', error);
      return NextResponse.json({ error: 'Failed to fetch available servers' }, { status: 500 });
    }
  })(request);
}
