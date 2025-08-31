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
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const actionFilter = url.searchParams.get('action');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Validate parameters
    if (!guildId || typeof guildId !== 'string') {
      console.error('❌ Invalid guildId:', guildId);
      return NextResponse.json({ error: "Invalid guild ID" }, { status: 400 });
    }

    // Check if this guild is part of a server group
    let groupGuildIds: string[] = [guildId];
    let groupInfo: any = null;
    try {
      const [groupResult] = await query(`
        SELECT g.group_id, sg.name as group_name, sg.description as group_description
        FROM guilds g
        LEFT JOIN server_groups sg ON g.group_id = sg.id
        WHERE g.guild_id = ? AND g.group_id IS NOT NULL
      `, [guildId]);
      
      if (groupResult && groupResult.length > 0 && groupResult[0].group_id) {
        // This guild is in a group, get all guilds in the same group
        const [groupMembers] = await query(`
          SELECT sgm.guild_id, g.guild_name
          FROM server_group_members sgm
          JOIN guilds g ON sgm.guild_id = g.guild_id
          WHERE sgm.group_id = ?
        `, [groupResult[0].group_id]);
        
        if (groupMembers && groupMembers.length > 0) {
          groupGuildIds = groupMembers.map((member: any) => member.guild_id);
          groupInfo = {
            id: groupResult[0].group_id,
            name: groupResult[0].group_name,
            description: groupResult[0].group_description,
            servers: groupMembers
          };
        }
      }
    } catch (error) {
      console.error('Error checking server group:', error);
      // Continue with single guild if group check fails
    }




    // Get cases with proper evidence count and server origin info
    const casesQuery = `
      SELECT
        mc.*,
        COALESCE(COUNT(me.id), 0) as evidence_count,
        g.guild_name as origin_server_name
      FROM moderation_cases mc
      LEFT JOIN moderation_evidence me ON mc.id = me.case_id AND mc.guild_id = me.guild_id
      JOIN guilds g ON mc.guild_id = g.guild_id
      WHERE mc.guild_id IN (${groupGuildIds.map(() => '?').join(',')})
      GROUP BY mc.id, mc.case_id, mc.action_type, mc.target_user_id, mc.target_username, 
               mc.moderator_user_id, mc.moderator_username, mc.reason, mc.duration_ms, 
               mc.duration_label, mc.active, mc.expires_at, mc.created_at, mc.updated_at,
               g.guild_name
      ORDER BY mc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...groupGuildIds, limit, offset];
    const cases = await query(casesQuery, queryParams);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM moderation_cases WHERE guild_id IN (${groupGuildIds.map(() => '?').join(',')})`;
    const countResult = await query(countQuery, groupGuildIds);
    const totalCount = (countResult as any)[0]?.total || 0;

    return NextResponse.json({
      cases,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      groupInfo,
      isGroupView: groupGuildIds.length > 1
    });

  } catch (error) {
    console.error('Error fetching moderation cases:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guildId } = await params;
    const body = await request.json();

    const {
      case_id,
      action_type,
      target_user_id,
      target_username,
      moderator_user_id,
      moderator_username,
      reason,
      duration_ms,
      duration_label
    } = body;

    // Validate required fields
    if (!case_id || !action_type || !target_user_id || !target_username || !moderator_user_id || !moderator_username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert new case
    const insertQuery = `
      INSERT INTO moderation_cases (
        guild_id, case_id, action_type, target_user_id, target_username,
        moderator_user_id, moderator_username, reason, duration_ms, duration_label,
        active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const insertParams = [
      guildId, case_id, action_type, target_user_id, target_username,
      moderator_user_id, moderator_username, reason || null, duration_ms || null, duration_label || null
    ];
    const result = await query(insertQuery, insertParams);

    // Also log to moderation_logs for backwards compatibility
    const logQuery = `
      INSERT INTO moderation_logs (guild_id, case_id, action, user_id, username, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const details = JSON.stringify({
      action_type,
      target_user_id,
      target_username,
      moderator_user_id,
      moderator_username,
      reason,
      duration_ms,
      duration_label
    });

    await query(logQuery, [guildId, case_id, action_type, target_user_id, target_username, details]);

    return NextResponse.json({
      success: true,
      case_id,
      id: (result as any).insertId
    });

  } catch (error) {
    console.error('Error creating moderation case:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
