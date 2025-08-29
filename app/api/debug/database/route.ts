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
// Debug endpoint to check member counts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'member-counts') {
    try {
      const memberCounts = await query('SELECT guild_id, guild_name, member_count, member_count_updated_at FROM guilds WHERE member_count IS NOT NULL ORDER BY member_count DESC LIMIT 10');
      const totalMembers = await query('SELECT SUM(member_count) as total FROM guilds WHERE member_count IS NOT NULL');
      const nullCounts = await query('SELECT COUNT(*) as count FROM guilds WHERE member_count IS NULL');

      return Response.json({
        topGuilds: memberCounts,
        totalMembers: totalMembers[0]?.total || 0,
        nullCount: nullCounts[0]?.count || 0,
        totalGuilds: memberCounts.length + (nullCounts[0]?.count || 0)
      });
    } catch (error) {
      return Response.json({
        error: 'Database error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }

  return GET_ORIGINAL();
}

export async function GET_ORIGINAL() {
  try {
    // Test basic database connection
    const testResult = await query('SELECT 1 as test');
    console.log('[DEBUG-DB] Basic connection test:', testResult);

    // Check if guilds table exists and has data
    const guildsResult = await query('SELECT COUNT(*) as count FROM guilds');
    console.log('[DEBUG-DB] Guilds table count:', guildsResult);

    // Check if guild_features table exists
    let featuresResult;
    try {
      featuresResult = await query('SELECT COUNT(*) as count FROM guild_features');
      console.log('[DEBUG-DB] Guild features table count:', featuresResult);
    } catch (error) {
      console.log('[DEBUG-DB] Guild features table does not exist or error:', error);
      featuresResult = { error: 'Table does not exist' };
    }

    // Check specific guild
    const specificGuildResult = await query(
      'SELECT guild_id, guild_name, premium FROM guilds WHERE guild_id = ?',
      ['1403257704222429224']
    );
    console.log('[DEBUG-DB] Specific guild query result:', specificGuildResult);

    // Check table structure
    const tableStructureResult = await query('DESCRIBE guilds');
    console.log('[DEBUG-DB] Guilds table structure:', tableStructureResult);

    return NextResponse.json({
      message: "Database connectivity and structure test",
      connection: "OK",
      guildsTable: {
        exists: true,
        count: Array.isArray(guildsResult) && guildsResult.length > 0 ? guildsResult[0]?.count : 'Unknown'
      },
      guildFeaturesTable: {
        exists: !featuresResult.error,
        count: featuresResult.error ? 'N/A' : (Array.isArray(featuresResult) && featuresResult.length > 0 ? featuresResult[0]?.count : 'Unknown')
      },
      specificGuild: {
        guildId: '1403257704222429224',
        found: Array.isArray(specificGuildResult) && specificGuildResult.length > 0,
        data: specificGuildResult
      },
      tableStructure: tableStructureResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DEBUG-DB] Database test failed:', error);
    return NextResponse.json({ 
      error: "Database test failed",
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}

