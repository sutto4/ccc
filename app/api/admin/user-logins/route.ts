import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Database connection helper for Discord bot database
async function query(sql: string, params?: any[]) {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.APP_DB_HOST || process.env.BOT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.APP_DB_USER || process.env.BOT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.APP_DB_PASSWORD || process.env.BOT_DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.APP_DB_NAME || process.env.BOT_DB_NAME || 'chester_bot',
    port: Number(process.env.APP_DB_PORT || process.env.BOT_DB_PORT || process.env.DB_PORT || 3306),
  });

  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

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

    // Get recent login history
    const loginHistory = await query(`
      SELECT
        discord_id,
        email,
        username,
        login_type,
        created_at,
        DATE(created_at) as login_date
      FROM user_logins
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get summary stats
    const [
      totalLoginsResult,
      firstTimeLoginsResult,
      returningLoginsResult,
      recentLoginsResult
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM user_logins'),
      query('SELECT COUNT(*) as count FROM user_logins WHERE login_type = "first_time"'),
      query('SELECT COUNT(*) as count FROM user_logins WHERE login_type = "returning"'),
      query('SELECT COUNT(*) as count FROM user_logins WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)')
    ]);

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
