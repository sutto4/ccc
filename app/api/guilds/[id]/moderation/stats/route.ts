import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authMiddleware(request);
    if (auth.error || !auth.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: guildId } = await params;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if user has access to this guild
    try {
      const accessControl = await query(
        'SELECT 1 FROM server_access_control WHERE user_id = ? AND guild_id = ? AND has_access = 1 LIMIT 1',
        [auth.user.id, guildId]
      );

      if (!Array.isArray(accessControl) || accessControl.length === 0) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } catch (accessError: any) {
      // If table doesn't exist, allow access for now (temporary fallback)
      if (accessError.code === 'ER_NO_SUCH_TABLE') {
        console.log('[MODERATION] server_access_control table not found, allowing access temporarily');
      } else {
        console.error('Error checking access control:', accessError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    // Get guild info to check for group membership
    const guildInfo = await query(
      'SELECT g.*, sg.id as group_id, sg.name as group_name, sg.description as group_description FROM guilds g LEFT JOIN server_groups sg ON g.group_id = sg.id WHERE g.guild_id = ?',
      [guildId]
    );

    if (guildInfo.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    const guild = guildInfo[0];
    const isGroupView = !!guild.group_id;

    let statsQuery = '';
    let queryParams: any[] = [];

    if (isGroupView) {
      // Get all guilds in the same group
      const groupGuilds = await query(
        'SELECT guild_id FROM guilds WHERE group_id = ?',
        [guild.group_id]
      );
      
      const groupGuildIds = groupGuilds.map((g: any) => g.guild_id);
      const placeholders = groupGuildIds.map(() => '?').join(',');
      
      statsQuery = `
        SELECT 
          COUNT(*) as totalCases,
          SUM(CASE WHEN action_type = 'ban' AND active = 1 THEN 1 ELSE 0 END) as activeBans,
          SUM(CASE WHEN action_type = 'mute' AND active = 1 THEN 1 ELSE 0 END) as activeMutes,
          SUM(CASE WHEN action_type IN ('warn', 'kick') AND active = 1 THEN 1 ELSE 0 END) as pendingReviews,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as recentCases24h
        FROM moderation_cases 
        WHERE guild_id IN (${placeholders})
      `;
      queryParams = groupGuildIds;
    } else {
      statsQuery = `
        SELECT 
          COUNT(*) as totalCases,
          SUM(CASE WHEN action_type = 'ban' AND active = 1 THEN 1 ELSE 0 END) as activeBans,
          SUM(CASE WHEN action_type = 'mute' AND active = 1 THEN 1 ELSE 0 END) as activeMutes,
          SUM(CASE WHEN action_type IN ('warn', 'kick') AND active = 1 THEN 1 ELSE 0 END) as pendingReviews,
          SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as recentCases24h
        FROM moderation_cases 
        WHERE guild_id = ?
      `;
      queryParams = [guildId];
    }

    const stats = await query(statsQuery, queryParams);
    const statsData = stats[0] || {
      totalCases: 0,
      activeBans: 0,
      activeMutes: 0,
      pendingReviews: 0,
      recentCases24h: 0
    };

    // Get group guild count if in group view
    let groupGuildCount = 1;
    let groupGuildIds: string[] = [];
    
    if (isGroupView) {
      const groupGuilds = await query(
        'SELECT guild_id FROM guilds WHERE group_id = ?',
        [guild.group_id]
      );
      groupGuildCount = groupGuilds.length;
      groupGuildIds = groupGuilds.map((g: any) => g.guild_id);
    }

    return NextResponse.json({
      totalCases: parseInt(statsData.totalCases) || 0,
      activeBans: parseInt(statsData.activeBans) || 0,
      activeMutes: parseInt(statsData.activeMutes) || 0,
      pendingReviews: parseInt(statsData.pendingReviews) || 0,
      recentCases24h: parseInt(statsData.recentCases24h) || 0,
      isGroupView,
      groupGuildCount,
      groupGuildIds
    });

  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation stats' },
      { status: 500 }
    );
  }
}