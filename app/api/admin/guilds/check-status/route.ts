import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    // Get all guilds with 'inactive' status
    const inactiveGuilds = await query(
      "SELECT guild_id, guild_name, status, updated_at FROM guilds WHERE status = 'inactive' ORDER BY updated_at DESC"
    );

    // Get all guilds with 'active' status for comparison
    const activeGuilds = await query(
      "SELECT guild_id, guild_name, status, updated_at FROM guilds WHERE status = 'active' OR status IS NULL ORDER BY updated_at DESC"
    );

    return NextResponse.json({
      inactiveGuilds: inactiveGuilds || [],
      activeGuilds: activeGuilds || [],
      summary: {
        totalInactive: inactiveGuilds?.length || 0,
        totalActive: activeGuilds?.length || 0,
        totalGuilds: (inactiveGuilds?.length || 0) + (activeGuilds?.length || 0)
      }
    });

  } catch (error) {
    console.error('Error checking guild statuses:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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

    const { action } = await request.json();

    if (action === 'fix-all-inactive') {
      // Reset all guilds with 'inactive' status to 'active'
      const result = await query(
        "UPDATE guilds SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE status = 'inactive'"
      );

      return NextResponse.json({
        success: true,
        message: `Reset ${result.affectedRows} guild(s) from 'inactive' to 'active' status`,
        affectedRows: result.affectedRows
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error('Error fixing guild statuses:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
