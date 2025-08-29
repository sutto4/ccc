import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    // Get total active servers and member counts from database
    const [totalServersResult, totalMembersResult] = await Promise.all([
      query("SELECT COUNT(*) as count FROM guilds WHERE status = 'active' OR status IS NULL"),
      query("SELECT SUM(member_count) as total FROM guilds WHERE (status = 'active' OR status IS NULL) AND member_count IS NOT NULL")
    ]);

    // Extract counts from results
    const totalServers = Array.isArray(totalServersResult) && totalServersResult.length > 0 ? Number(totalServersResult[0].count) : 0;
    const totalMembers = Array.isArray(totalMembersResult) && totalMembersResult.length > 0 ? Number(totalMembersResult[0].total) : 0;

    const stats = {
      totalServers,
      totalMembers,
      activeServers: totalServers,
      averageMembersPerServer: totalServers > 0 ? Math.round(totalMembers / totalServers) : 0
    };

    console.log(`[STATS] Returning stats from database:`, stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[STATS] Error fetching public stats:', error);
    // Return fallback stats on error
    return NextResponse.json({
      totalServers: 0,
      totalMembers: 0,
      activeServers: 0,
      averageMembersPerServer: 0
    });
  }
}
