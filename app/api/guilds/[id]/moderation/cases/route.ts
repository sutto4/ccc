import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: guildId } = await params;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if user has access to this guild
    const accessControl = await db.query(
      'SELECT * FROM access_control WHERE user_id = ? AND guild_id = ?',
      [session.user.id, guildId]
    );

    if (accessControl.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';

    // Get guild info to check for group membership
    const guildInfo = await db.query(
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
      const groupGuilds = await db.query(
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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get cases with guild names for group view
    const casesQuery = `
      SELECT 
        mc.*,
        g.name as origin_server_name
      FROM moderation_cases mc
      LEFT JOIN guilds g ON mc.guild_id = g.guild_id
      ${whereClause}
      ORDER BY mc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const cases = await db.query(casesQuery, [...queryParams, limit, offset]);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM moderation_cases mc
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, queryParams);
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
      origin_server_name: isGroupView ? caseItem.origin_server_name : undefined
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
    return NextResponse.json(
      { error: 'Failed to fetch moderation cases' },
      { status: 500 }
    );
  }
}