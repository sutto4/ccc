import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authz';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (auth) => {
    try {
      const { id } = await params;
      const { guildId } = await request.json();

      if (!guildId) {
        return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
      }

      const userId = auth.discordId || '351321199059533826'; // Fallback for debugging

      // Check if user has access to the guild
      const accessCheck = await query(`
        SELECT 1 FROM server_access_control 
        WHERE user_id = ? AND guild_id = ? AND has_access = 1
      `, [userId, guildId]);

      if (accessCheck.length === 0) {
        return NextResponse.json({ error: 'No access to this guild' }, { status: 403 });
      }

      // Check if guild is already in a group
      const existingGroup = await query(`
        SELECT sgm.group_id, sg.name as group_name
        FROM server_group_members sgm
        LEFT JOIN server_groups sg ON sgm.group_id = sg.id
        WHERE sgm.guild_id = ?
      `, [guildId]);

      if (existingGroup.length > 0) {
        return NextResponse.json({ 
          error: `Server is already in group "${existingGroup[0].group_name}"` 
        }, { status: 400 });
      }

      // Get user's subscription plan to check limits
      const userPlanResult = await query(`
        SELECT DISTINCT g.product_name
        FROM guilds g
        JOIN server_access_control sac ON g.guild_id = sac.guild_id
        WHERE sac.user_id = ? AND sac.has_access = 1 AND g.product_name IS NOT NULL
        ORDER BY 
          CASE g.product_name
            WHEN 'Network' THEN 3
            WHEN 'City' THEN 2
            WHEN 'Squad' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `, [userId]);

      let userPlan = 'free';
      if (userPlanResult.length > 0) {
        userPlan = userPlanResult[0].product_name.toLowerCase();
      }

      // Check server limit per group
      const currentServerCount = await query(`
        SELECT COUNT(*) as count FROM server_group_members WHERE group_id = ?
      `, [id]);

      const currentCount = currentServerCount[0]?.count || 0;
      let serverLimitPerGroup = 0;

      switch (userPlan) {
        case 'network':
          serverLimitPerGroup = -1; // Unlimited
          break;
        case 'city':
          serverLimitPerGroup = 10;
          break;
        case 'squad':
          serverLimitPerGroup = 3;
          break;
        default:
          serverLimitPerGroup = 0;
      }

      if (serverLimitPerGroup !== -1 && currentCount >= serverLimitPerGroup) {
        return NextResponse.json({ 
          error: `Server limit reached for your plan (${serverLimitPerGroup} servers per group)` 
        }, { status: 403 });
      }

      // Check if this will be the first server in the group
      const existingServers = await query(`
        SELECT COUNT(*) as count FROM server_group_members WHERE group_id = ?
      `, [id]);

      const isFirstServer = existingServers[0]?.count === 0;

      // Add server to group
      await query(`
        INSERT INTO server_group_members (group_id, guild_id, added_by, is_primary)
        VALUES (?, ?, ?, ?)
      `, [id, guildId, userId, isFirstServer ? 1 : 0]);

      // Get updated group info
      const updatedGroup = await query(`
        SELECT 
          sg.id,
          sg.name,
          sg.description,
          sg.icon_url,
          COUNT(sgm.guild_id) as server_count,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', g.guild_id,
              'name', g.guild_name,
              'memberCount', g.member_count,
              'isOnline', CASE WHEN g.last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END,
              'isPrimary', CASE WHEN sgm.guild_id = (
                SELECT guild_id FROM server_group_members 
                WHERE group_id = sg.id 
                ORDER BY added_at ASC 
                LIMIT 1
              ) THEN 1 ELSE 0 END
            )
          ) as servers
        FROM server_groups sg
        LEFT JOIN server_group_members sgm ON sg.id = sgm.group_id
        LEFT JOIN guilds g ON sgm.guild_id = g.guild_id
        WHERE sg.id = ?
        GROUP BY sg.id
      `, [id]);

      return NextResponse.json({ 
        success: true, 
        group: updatedGroup[0] 
      });

    } catch (error) {
      console.error('[SERVER-GROUPS] Error adding server:', error);
      return NextResponse.json({ error: 'Failed to add server to group' }, { status: 500 });
    }
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (auth) => {
    try {
      const { id } = await params;
      const { guildId } = await request.json();

      if (!guildId) {
        return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
      }

      const userId = auth.discordId || '351321199059533826'; // Fallback for debugging

      // Check if user has access to the guild
      const accessCheck = await query(`
        SELECT 1 FROM server_access_control 
        WHERE user_id = ? AND guild_id = ? AND has_access = 1
      `, [userId, guildId]);

      if (accessCheck.length === 0) {
        return NextResponse.json({ error: 'No access to this guild' }, { status: 403 });
      }

      // Check if this is the primary server (first added)
      const primaryCheck = await query(`
        SELECT guild_id FROM server_group_members 
        WHERE group_id = ? 
        ORDER BY added_at ASC 
        LIMIT 1
      `, [id]);

      if (primaryCheck.length > 0 && primaryCheck[0].guild_id === guildId) {
        return NextResponse.json({ 
          error: 'Cannot remove the primary server from the group' 
        }, { status: 400 });
      }

      // Remove server from group
      await query(`
        DELETE FROM server_group_members 
        WHERE group_id = ? AND guild_id = ?
      `, [id, guildId]);

      // Get updated group info
      const updatedGroup = await query(`
        SELECT 
          sg.id,
          sg.name,
          sg.description,
          sg.icon_url,
          COUNT(sgm.guild_id) as server_count,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', g.guild_id,
              'name', g.guild_name,
              'memberCount', g.member_count,
              'isOnline', CASE WHEN g.last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END,
              'isPrimary', CASE WHEN sgm.guild_id = (
                SELECT guild_id FROM server_group_members 
                WHERE group_id = sg.id 
                ORDER BY added_at ASC 
                LIMIT 1
              ) THEN 1 ELSE 0 END
            )
          ) as servers
        FROM server_groups sg
        LEFT JOIN server_group_members sgm ON sg.id = sgm.group_id
        LEFT JOIN guilds g ON sgm.guild_id = g.guild_id
        WHERE sg.id = ?
        GROUP BY sg.id
      `, [id]);

      return NextResponse.json({ 
        success: true, 
        group: updatedGroup[0] 
      });

    } catch (error) {
      console.error('[SERVER-GROUPS] Error removing server:', error);
      return NextResponse.json({ error: 'Failed to remove server from group' }, { status: 500 });
    }
  })(request);
}
