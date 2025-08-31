import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Database connection helper for Discord bot database
async function query(sql: string, params: any[] = []) {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.APP_DB_HOST || process.env.BOT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.APP_DB_USER || process.env.BOT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.APP_DB_PASSWORD || process.env.BOT_DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.APP_DB_NAME || process.env.BOT_DB_NAME || 'chester_bot',
    port: Number(process.env.APP_DB_PORT || process.env.BOT_DB_PORT || process.env.DB_PORT || 3306),
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

// Generate a unique case ID
function generateCaseId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `case_${timestamp}_${random}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: guildId } = await params;
    const body = await request.json();

    const {
      action,
      target_user_id,
      target_username,
      reason,
      duration_ms
    } = body;

    // Validate required fields
    if (!action || !target_user_id || !target_username) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate action type
    const validActions = ['ban', 'unban', 'kick', 'timeout', 'mute', 'unmute'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // Generate case ID
    const caseId = generateCaseId();

    // Calculate duration details
    let duration_label = null;
    let expires_at = null;

    if (duration_ms && (action === 'timeout' || action === 'mute')) {
      const durationSeconds = Math.floor(duration_ms / 1000);
      expires_at = new Date(Date.now() + duration_ms);

      if (durationSeconds < 3600) {
        duration_label = `${Math.floor(durationSeconds / 60)} minutes`;
      } else if (durationSeconds < 86400) {
        duration_label = `${Math.floor(durationSeconds / 3600)} hours`;
      } else {
        duration_label = `${Math.floor(durationSeconds / 86400)} days`;
      }
    }

    // First, try to perform the action via Discord bot
    try {
      const botResponse = await fetch(`${process.env.BOT_API_URL || 'http://localhost:3001'}/api/moderation/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_API_KEY || 'dev-key'}`
        },
        body: JSON.stringify({
          guildId,
          action,
          targetUserId: target_user_id,
          reason: reason || 'No reason provided',
          duration: duration_ms
        })
      });

      if (!botResponse.ok) {
        const errorData = await botResponse.json().catch(() => ({}));
        console.error('Bot action failed:', errorData);
        // Continue with database logging even if bot action fails
      } else {
        console.log(`✅ Bot action successful: ${action} on ${target_username}`);
      }
    } catch (botError) {
      console.error('Failed to communicate with bot:', botError);
      // Continue with database logging
    }

    // Save to database regardless of bot success/failure
    const insertQuery = `
      INSERT INTO moderation_cases (
        guild_id, case_id, action_type, target_user_id, target_username,
        moderator_user_id, moderator_username, reason, duration_ms, duration_label,
        active, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
    `;

    const result = await query(insertQuery, [guildId, caseId, action, target_user_id, target_username, session.user.id, session.user.name || session.user.email || 'Unknown', reason || null, duration_ms || null, duration_label, expires_at]);

    // Also log to moderation_logs for backwards compatibility
    const logQuery = `
      INSERT INTO moderation_logs (guild_id, case_id, action, user_id, username, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const details = JSON.stringify({
      action_type: action,
      target_user_id,
      target_username,
      moderator_user_id: session.user.id,
      moderator_username: session.user.name || session.user.email || 'Unknown',
      reason,
      duration_ms,
      duration_label,
      bot_action_attempted: true
    });

    await query(logQuery, [guildId, caseId, action, target_user_id, target_username, details]);

    return NextResponse.json({
      success: true,
      case_id: caseId,
      id: (result as any).insertId,
      message: `Successfully ${action}ned ${target_username}`
    });

  } catch (error) {
    console.error('Error performing moderation action:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
