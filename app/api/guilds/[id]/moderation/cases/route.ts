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
        console.log('[MODERATION-CASES] server_access_control table not found, allowing access temporarily');
      } else {
        console.error('[MODERATION-CASES] Error checking access control:', accessError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';

    // Get guild info to check for group membership
    const guildInfo = await query(
      'SELECT g.*, sg.id as group_id, sg.name as group_name FROM guilds g LEFT JOIN server_groups sg ON g.group_id = sg.id WHERE g.guild_id = ?',
      [guildId]
    );

    if (guildInfo.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    const guild = guildInfo[0];
    const isGroupView = !!guild.group_id;

    // Build the query
    let whereConditions = [];
    let queryParams: any[] = [];

    if (isGroupView) {
      // Get all guilds in the same group
      const groupGuilds = await query(
        'SELECT guild_id FROM guilds WHERE group_id = ?',
        [guild.group_id]
      );
      
      const groupGuildIds = groupGuilds.map((g: any) => g.guild_id);
      const placeholders = groupGuildIds.map(() => '?').join(',');
      whereConditions.push(`mc.guild_id IN (${placeholders})`);
      queryParams.push(...groupGuildIds);
    } else {
      whereConditions.push('mc.guild_id = ?');
      queryParams.push(guildId);
    }

    if (search) {
      whereConditions.push('(mc.target_username LIKE ? OR mc.moderator_username LIKE ? OR mc.reason LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (action) {
      whereConditions.push('mc.action_type = ?');
      queryParams.push(action);
    }

    // Build query based on whether this is a group view
    let casesQuery: string;
    let finalParams: any[];
    
    if (isGroupView) {
      // Get all guilds in the same group with their names
      const groupGuilds = await query(
        'SELECT guild_id, guild_name FROM guilds WHERE group_id = ?',
        [guild.group_id]
      );
      
      const groupGuildIds = groupGuilds.map((g: any) => g.guild_id);
      const placeholders = groupGuildIds.map(() => '?').join(',');
      
      casesQuery = `
        SELECT 
          mc.*,
          g.guild_name
        FROM moderation_cases mc
        LEFT JOIN guilds g ON mc.guild_id = g.guild_id
        WHERE mc.guild_id IN (${placeholders})
        ORDER BY mc.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      finalParams = groupGuildIds;
    } else {
      casesQuery = `
        SELECT 
          mc.*
        FROM moderation_cases mc
        WHERE mc.guild_id = ?
        ORDER BY mc.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      finalParams = [guildId];
    }
    
    console.log('[MODERATION-CASES] Query:', casesQuery);
    console.log('[MODERATION-CASES] Params:', finalParams);
    console.log('[MODERATION-CASES] Is group view:', isGroupView);
    
    let cases;
    try {
      cases = await query(casesQuery, finalParams);
    } catch (queryError: any) {
      console.error('[MODERATION-CASES] Query failed:', queryError);
      if (queryError.code === 'ER_NO_SUCH_TABLE') {
        console.log('[MODERATION-CASES] moderation_cases table does not exist, returning empty results');
        cases = [];
      } else {
        throw queryError;
      }
    }

    // Get total count for pagination
    let countQuery: string;
    let countParams: any[];
    
    if (isGroupView) {
      const groupGuilds = await query(
        'SELECT guild_id FROM guilds WHERE group_id = ?',
        [guild.group_id]
      );
      const groupGuildIds = groupGuilds.map((g: any) => g.guild_id);
      const placeholders = groupGuildIds.map(() => '?').join(',');
      
      countQuery = `
        SELECT COUNT(*) as total
        FROM moderation_cases mc
        WHERE mc.guild_id IN (${placeholders})
      `;
      countParams = groupGuildIds;
    } else {
      countQuery = `
        SELECT COUNT(*) as total
        FROM moderation_cases mc
        WHERE mc.guild_id = ?
      `;
      countParams = [guildId];
    }

    let countResult;
    try {
      countResult = await query(countQuery, countParams);
    } catch (countError: any) {
      console.error('[MODERATION-CASES] Count query failed:', countError);
      if (countError.code === 'ER_NO_SUCH_TABLE') {
        console.log('[MODERATION-CASES] moderation_cases table does not exist for count, returning 0');
        countResult = [{ total: 0 }];
      } else {
        throw countError;
      }
    }
    const total = countResult[0]?.total || 0;
    const hasMore = offset + limit < total;

    // Format the response
    const formattedCases = cases.map((caseItem: any) => ({
      id: caseItem.id,
      case_id: caseItem.case_id,
      action_type: caseItem.action_type,
      target_user_id: caseItem.target_user_id,
      target_username: caseItem.target_username,
      moderator_user_id: caseItem.moderator_user_id,
      moderator_username: caseItem.moderator_username,
      reason: caseItem.reason,
      duration_ms: caseItem.duration_ms,
      duration_label: caseItem.duration_label,
      active: caseItem.active,
      expires_at: caseItem.expires_at,
      created_at: caseItem.created_at,
      updated_at: caseItem.updated_at,
      evidence_count: caseItem.evidence_count || 0,
      origin_server_name: isGroupView ? (caseItem.guild_name || `Server ${caseItem.guild_id}`) : undefined
    }));

    return NextResponse.json({
      cases: formattedCases,
      pagination: {
        total,
        limit,
        offset,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching moderation cases:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation cases', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}