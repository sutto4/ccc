import { NextRequest, NextResponse } from "next/server";
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

    // First, let's check what tables and columns actually exist
    try {
      // Test basic guilds table access
      const testGuilds = await query("SELECT COUNT(*) as count FROM guilds");
      console.log('Guilds table test result:', testGuilds);
      
      // Test if status column exists
      const testStatus = await query("SELECT guild_id, status FROM guilds LIMIT 1");
      console.log('Status column test result:', testStatus);
      
      // Test if custom_commands table exists
      const testCommands = await query("SELECT COUNT(*) as count FROM custom_commands");
      console.log('Custom commands table test result:', testCommands);
      
      // Test if embedded_messages table exists
      const testEmbeds = await query("SELECT COUNT(*) as count FROM embedded_messages");
      console.log('Embedded messages table test result:', testEmbeds);
      
    } catch (testError) {
      console.error('Table structure test failed:', testError);
      return NextResponse.json({
        error: "Database structure test failed",
        details: testError instanceof Error ? testError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Get comprehensive stats using raw SQL queries
    const [
      totalServersResult,
      totalUsersResult,
      premiumServersResult,
      activeServersResult,
      totalCommandsResult,
      totalEmbedsResult,
      newServers24hResult,
      newServers48hResult
    ] = await Promise.all([
      // Total servers
      query("SELECT COUNT(*) as count FROM guilds"),

      // Total users (sum of member_count from active guilds)
      query("SELECT SUM(member_count) as total FROM guilds WHERE (status = 'active' OR status IS NULL) AND member_count IS NOT NULL"),

      // Premium servers
      query("SELECT COUNT(*) as count FROM guilds WHERE premium = 1"),

      // Active servers (not inactive) - check if status column exists
      query("SELECT COUNT(*) as count FROM guilds WHERE status = 'active' OR status IS NULL"),

      // Total custom commands
      query("SELECT COUNT(*) as count FROM custom_commands"),

      // Total embedded messages
      query("SELECT COUNT(*) as count FROM embedded_messages"),

      // New servers in last 24 hours - use created_at if joined_at doesn't exist
      query("SELECT COUNT(*) as count FROM guilds WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)"),

      // New servers in last 48 hours - use created_at if joined_at doesn't exist
      query("SELECT COUNT(*) as count FROM guilds WHERE created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)")
    ]);

    // Extract counts from results
    const totalServers = Array.isArray(totalServersResult) && totalServersResult.length > 0 ? totalServersResult[0].count : 0;
    const totalUsers = Array.isArray(totalUsersResult) && totalUsersResult.length > 0 ? Number(totalUsersResult[0].total) || 0 : 0;
    const premiumServers = Array.isArray(premiumServersResult) && premiumServersResult.length > 0 ? premiumServersResult[0].count : 0;
    const activeServers = Array.isArray(activeServersResult) && activeServersResult.length > 0 ? activeServersResult[0].count : 0;
    const totalCommands = Array.isArray(totalCommandsResult) && totalCommandsResult.length > 0 ? totalCommandsResult[0].count : 0;
    const totalEmbeds = Array.isArray(totalEmbedsResult) && totalEmbedsResult.length > 0 ? totalEmbedsResult[0].count : 0;
    const newServers24h = Array.isArray(newServers24hResult) && newServers24hResult.length > 0 ? newServers24hResult[0].count : 0;
    const newServers48h = Array.isArray(newServers48hResult) && newServers48hResult.length > 0 ? newServers48hResult[0].count : 0;

    const stats = {
      totalServers,
      totalUsers,
      premiumServers,
      activeServers,
      totalCommands,
      totalEmbeds,
      newServers24h,
      newServers48h,
      conversionRate: totalServers > 0 ? ((premiumServers / totalServers) * 100).toFixed(1) : "0",
      averageUsersPerServer: activeServers > 0 ? Math.round(totalUsers / activeServers) : 0
    };

    console.log('[ADMIN-STATS] Returning stats:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 }
    );
  }
}
