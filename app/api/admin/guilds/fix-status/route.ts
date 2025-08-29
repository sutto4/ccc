import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userResult = await query(
      "SELECT role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!Array.isArray(userResult) || userResult.length === 0 || userResult[0]?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { guildId, action, userId, grantedBy, notes } = await request.json();

    if (!guildId || !action) {
      return NextResponse.json({ error: "Missing guildId or action" }, { status: 400 });
    }

    let result;
    let message;

    switch (action) {
      case 'reset-inactive-status':
        // Reset guild status from 'inactive' back to 'active'
        result = await query(
          "UPDATE guilds SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND status = 'inactive'",
          [guildId]
        );

        if (result.affectedRows > 0) {
          message = `Guild ${guildId} status reset from 'inactive' to 'active'`;
        } else {
          message = `Guild ${guildId} not found or already has active status`;
        }
        break;

      case 'set-active':
        // Force set guild status to 'active'
        result = await query(
          "UPDATE guilds SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?",
          [guildId]
        );
        
        if (result.affectedRows > 0) {
          message = `Guild ${guildId} status set to 'active'`;
        } else {
          message = `Guild ${guildId} not found`;
        }
        break;

      case 'set-inactive':
        // Force set guild status to 'inactive'
        result = await query(
          "UPDATE guilds SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?",
          [guildId]
        );

        if (result.affectedRows > 0) {
          message = `Guild ${guildId} status set to 'inactive'`;
        } else {
          message = `Guild ${guildId} not found`;
        }
        break;

      case 'grant-access':
        // Manually grant access to a user for a specific guild
        if (!guildId || !userId) {
          return NextResponse.json({ error: "guildId and userId are required" }, { status: 400 });
        }

        try {
          // Check if the user exists in the server_access_control table
          const existingAccess = await query(
            'SELECT id FROM server_access_control WHERE guild_id = ? AND user_id = ?',
            [guildId, userId]
          );

          if ((existingAccess as any[]).length > 0) {
            message = `User ${userId} already has access to guild ${guildId}`;
          } else {
            // Grant access
            await query(
              'INSERT INTO server_access_control (guild_id, user_id, has_access, granted_by, notes) VALUES (?, ?, 1, ?, ?)',
              [guildId, userId, grantedBy || 'SYSTEM', notes || 'Manually granted access']
            );

            // Also update guild status to active if it's inactive
            await query(
              'UPDATE guilds SET status = "active", updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND status = "inactive"',
              [guildId]
            );

            message = `Granted access to user ${userId} for guild ${guildId}`;
          }
        } catch (dbError) {
          console.error('Error granting access:', dbError);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message,
      affectedRows: result.affectedRows 
    });

  } catch (error) {
    console.error('Error fixing guild status:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
