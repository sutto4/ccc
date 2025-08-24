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

    const { guildId, action } = await request.json();

    if (!guildId || !action) {
      return NextResponse.json({ error: "Missing guildId or action" }, { status: 400 });
    }

    let result;
    let message;

    switch (action) {
      case 'reset-left-status':
        // Reset guild status from 'left' back to 'active'
        result = await query(
          "UPDATE guilds SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND status = 'left'",
          [guildId]
        );
        
        if (result.affectedRows > 0) {
          message = `Guild ${guildId} status reset from 'left' to 'active'`;
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

      case 'set-left':
        // Force set guild status to 'left'
        result = await query(
          "UPDATE guilds SET status = 'left', updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?",
          [guildId]
        );
        
        if (result.affectedRows > 0) {
          message = `Guild ${guildId} status set to 'left'`;
        } else {
          message = `Guild ${guildId} not found`;
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
