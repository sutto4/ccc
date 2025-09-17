import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: Request) {
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Sanitize inputs to prevent SQL injection
    const safeLimit = Math.max(1, Math.min(200, limit));
    const safeOffset = Math.max(0, offset);

    console.log(`[USER-LOGINS] Fetching with limit=${safeLimit}, offset=${safeOffset}`);

    // Get recent login history
    let loginHistory;
    try {
      loginHistory = await query(`
        SELECT
          discord_id,
          email,
          username,
          login_type,
          created_at,
          DATE(created_at) as login_date
        FROM user_logins
        ORDER BY created_at DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `);
      console.log(`[USER-LOGINS] Found ${Array.isArray(loginHistory) ? loginHistory.length : 0} login records`);
    } catch (historyError) {
      console.warn('[USER-LOGINS] Error fetching login history:', historyError);
      loginHistory = []; // Set empty array if query fails
    }

    // Get summary stats
    let totalLoginsResult, firstTimeLoginsResult, returningLoginsResult, recentLoginsResult;

    try {
      [totalLoginsResult, firstTimeLoginsResult, returningLoginsResult, recentLoginsResult] = await Promise.all([
        query('SELECT COUNT(*) as count FROM user_logins'),
        query('SELECT COUNT(*) as count FROM user_logins WHERE login_type = "first_time"'),
        query('SELECT COUNT(*) as count FROM user_logins WHERE login_type = "returning"'),
        query('SELECT COUNT(*) as count FROM user_logins WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)')
      ]);
    } catch (statsError) {
      console.warn('[USER-LOGINS] Error fetching stats:', statsError);
      // Set default values if stats queries fail
      totalLoginsResult = [{ count: 0 }];
      firstTimeLoginsResult = [{ count: 0 }];
      returningLoginsResult = [{ count: 0 }];
      recentLoginsResult = [{ count: 0 }];
    }

    const stats = {
      totalLogins: (totalLoginsResult as any)[0]?.count || 0,
      firstTimeLogins: (firstTimeLoginsResult as any)[0]?.count || 0,
      returningLogins: (returningLoginsResult as any)[0]?.count || 0,
      recentLogins24h: (recentLoginsResult as any)[0]?.count || 0,
      uniqueUsers: new Set((loginHistory as any[]).map(login => login.discord_id)).size
    };

    return NextResponse.json({
      loginHistory,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: (loginHistory as any[]).length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching user login history:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
