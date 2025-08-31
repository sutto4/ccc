import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Database connection helper for Discord bot database
async function query(sql: string, params: any[] = []) {
  const mysql = require('mysql2/promise');

  // Create a new connection for this query
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'chester_bot',
    port: process.env.DB_PORT || 3306,
  });

  try {
    // Handle parameters properly
    if (!params || params.length === 0) {
      const [rows] = await connection.query(sql);
      return rows;
    }

    const [rows] = await connection.query(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: guildId } = await params;

    // Check if this guild is part of a server group
    let groupGuildIds: string[] = [guildId];
    try {
      const [groupResult] = await query(`
        SELECT g.group_id, sgm.guild_id as member_guild_id
        FROM guilds g
        LEFT JOIN server_group_members sgm ON g.group_id = sgm.group_id
        WHERE g.guild_id = ? AND g.group_id IS NOT NULL
      `, [guildId]);
      
      if (groupResult && groupResult.length > 0 && groupResult[0].group_id) {
        // This guild is in a group, get all guilds in the same group
        const [groupMembers] = await query(`
          SELECT guild_id FROM server_group_members 
          WHERE group_id = ?
        `, [groupResult[0].group_id]);
        
        if (groupMembers && groupMembers.length > 0) {
          groupGuildIds = groupMembers.map((member: any) => member.guild_id);
        }
      }
    } catch (error) {
      console.error('Error checking server group:', error);
      // Continue with single guild if group check fails
    }

    // Get various stats in parallel
    const [
      totalCasesResult,
      activeBansResult,
      activeMutesResult,
      pendingReviewsResult,
      recentCasesResult,
      actionBreakdownResult
    ] = await Promise.all([
      // Total cases
      query(`SELECT COUNT(*) as count FROM moderation_cases WHERE guild_id IN (${groupGuildIds.map(() => '?').join(',')})`, groupGuildIds),

      // Active bans (ban actions that are still active and haven't expired)
      query(`
        SELECT COUNT(*) as count
        FROM moderation_cases
        WHERE guild_id IN (${groupGuildIds.map(() => '?').join(',')}) AND action_type = 'ban' AND active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
      `, groupGuildIds),

      // Active mutes (mute actions that are still active and haven't expired)
      query(`
        SELECT COUNT(*) as count
        FROM moderation_cases
        WHERE guild_id IN (${groupGuildIds.map(() => '?').join(',')}) AND action_type = 'mute' AND active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
      `, groupGuildIds),

      // Pending reviews (BANS without evidence that need attention)
      query(`
        SELECT COUNT(*) as count
        FROM moderation_cases mc
        LEFT JOIN moderation_evidence me ON mc.id = me.case_id AND mc.guild_id = me.guild_id
        WHERE mc.guild_id IN (${groupGuildIds.map(() => '?').join(',')}) 
          AND mc.action_type = 'ban' 
          AND mc.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY mc.id
        HAVING COUNT(me.id) = 0
      `, groupGuildIds),

      // Recent cases (last 24 hours)
      query(`
        SELECT COUNT(*) as count
        FROM moderation_cases
        WHERE guild_id IN (${groupGuildIds.map(() => '?').join(',')}) AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `, groupGuildIds),

      // Action breakdown
      query(`
        SELECT action_type, COUNT(*) as count
        FROM moderation_cases
        WHERE guild_id IN (${groupGuildIds.map(() => '?').join(',')})
        GROUP BY action_type
        ORDER BY count DESC
      `, groupGuildIds)
    ]);

    const stats = {
      totalCases: (totalCasesResult as any)[0]?.count || 0,
      activeBans: (activeBansResult as any)[0]?.count || 0,
      activeMutes: (activeMutesResult as any)[0]?.count || 0,
      pendingReviews: (pendingReviewsResult as any).length || 0,
      recentCases24h: (recentCasesResult as any)[0]?.count || 0,
      actionBreakdown: actionBreakdownResult as any[],
      isGroupView: groupGuildIds.length > 1,
      groupGuildCount: groupGuildIds.length,
      groupGuildIds: groupGuildIds
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
