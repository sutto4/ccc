import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; caseId: string }> }
) {
  try {
    const auth = await authMiddleware(request);
    if (auth.error || !auth.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: guildId, caseId } = await params;
    if (!guildId || !caseId) {
      return NextResponse.json({ error: 'Guild ID and Case ID are required' }, { status: 400 });
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
      if (accessError.code === 'ER_NO_SUCH_TABLE') {
        console.log('[CASE-DETAIL] server_access_control table not found, allowing access temporarily');
      } else {
        console.error('[CASE-DETAIL] Error checking access control:', accessError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
    }

    // Get guild info to check if it's part of a group
    let guild;
    try {
      const guildResult = await query(
        'SELECT guild_id, guild_name, group_id FROM guilds WHERE guild_id = ? LIMIT 1',
        [guildId]
      );
      guild = guildResult[0];
    } catch (guildError: any) {
      console.error('[CASE-DETAIL] Error fetching guild info:', guildError);
      return NextResponse.json({ error: 'Failed to fetch guild info' }, { status: 500 });
    }

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    const isGroupView = guild.group_id !== null;

    // Build query based on whether this is a group view
    let caseQuery: string;
    let queryParams: any[];
    
    if (isGroupView) {
      // Get all guilds in the same group
      const groupGuilds = await query(
        'SELECT guild_id FROM guilds WHERE group_id = ?',
        [guild.group_id]
      );
      
      const groupGuildIds = groupGuilds.map((g: any) => g.guild_id);
      const placeholders = groupGuildIds.map(() => '?').join(',');
      
      caseQuery = `
        SELECT 
          mc.*,
          g.guild_name
        FROM moderation_cases mc
        LEFT JOIN guilds g ON mc.guild_id = g.guild_id
        WHERE mc.case_id = ? AND mc.guild_id IN (${placeholders})
        LIMIT 1
      `;
      queryParams = [caseId, ...groupGuildIds];
    } else {
      caseQuery = `
        SELECT 
          mc.*
        FROM moderation_cases mc
        WHERE mc.case_id = ? AND mc.guild_id = ?
        LIMIT 1
      `;
      queryParams = [caseId, guildId];
    }

    console.log('[CASE-DETAIL] Query:', caseQuery);
    console.log('[CASE-DETAIL] Params:', queryParams);

    let caseResult;
    try {
      caseResult = await query(caseQuery, queryParams);
    } catch (queryError: any) {
      console.error('[CASE-DETAIL] Query failed:', queryError);
      if (queryError.code === 'ER_NO_SUCH_TABLE') {
        console.log('[CASE-DETAIL] moderation_cases table does not exist, returning 404');
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      } else {
        throw queryError;
      }
    }

    if (!Array.isArray(caseResult) || caseResult.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Get evidence for this case (if evidence table exists)
    let evidence = [];
    try {
      const evidenceResult = await query(
        'SELECT * FROM moderation_evidence WHERE case_id = ? ORDER BY uploaded_at ASC',
        [caseId]
      );
      evidence = evidenceResult || [];
    } catch (evidenceError: any) {
      console.log('[CASE-DETAIL] Evidence table does not exist or error:', evidenceError);
      // Evidence table might not exist yet, that's okay
    }

    // Format the response
    const formattedCase = {
      id: caseData.id,
      case_id: caseData.case_id,
      action_type: caseData.action_type,
      target_user_id: caseData.target_user_id,
      target_username: caseData.target_username,
      moderator_user_id: caseData.moderator_user_id,
      moderator_username: caseData.moderator_username,
      reason: caseData.reason,
      duration_ms: caseData.duration_ms,
      duration_label: caseData.duration_label,
      active: caseData.active,
      expires_at: caseData.expires_at,
      created_at: caseData.created_at,
      updated_at: caseData.updated_at,
      evidence_count: caseData.evidence_count || 0,
      origin_server_name: isGroupView ? (caseData.guild_name || `Server ${caseData.guild_id}`) : undefined
    };

    return NextResponse.json({
      case: formattedCase,
      evidence: evidence
    });

  } catch (error) {
    console.error('Error fetching case details:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to fetch case details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}