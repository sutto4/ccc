import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
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

