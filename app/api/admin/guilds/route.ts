
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

    // First, let's test basic guilds table access with minimal columns
    try {
      const testGuilds = await query("SELECT guild_id, guild_name FROM guilds LIMIT 5");
      console.log('Basic guilds test result:', testGuilds);
      
      // Test if we can get more columns
      const testExtended = await query("SELECT guild_id, guild_name, premium FROM guilds LIMIT 1");
      console.log('Extended guilds test result:', testExtended);
      
    } catch (testError) {
      console.error('Table structure test failed:', testError);
      return NextResponse.json({
        error: "Database structure test failed",
        details: testError instanceof Error ? testError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Fetch guilds with only the columns we know exist - no ORDER BY for now
    const guilds = await query(`
      SELECT
        guild_id,
        guild_name,
        member_count,
        premium,
        status,
        created_at
      FROM guilds
      LIMIT 100
    `);

    console.log('Guilds query result:', guilds);

    // Debug: Check what created_at values look like
    if (guilds.length > 0) {
      console.log('Sample created_at values:', guilds.slice(0, 3).map((g: any) => ({
        guild_id: g.guild_id,
        created_at: g.created_at,
        created_at_type: typeof g.created_at,
        parsed_date: g.created_at ? new Date(g.created_at) : null
      })));
    }

    // Transform the data to match the dashboard interface
    const transformedGuilds = guilds.map((guild: any) => ({
      id: guild.guild_id,
      name: guild.guild_name || guild.guild_id,
      icon_url: null, // We'll add this later when we confirm the column exists
      member_count: Number(guild.member_count) || 0, // Use actual member count from database
      premium: Boolean(guild.premium),
      status: guild.status || 'active', // Use actual database status, default to 'active' if null
      created_at: guild.created_at || new Date().toISOString(), // Use actual database value
      features: [] // We'll add features later
    }));

    console.log('Transformed guilds:', transformedGuilds.length);

    return NextResponse.json(transformedGuilds);
  } catch (error) {
    console.error('Error fetching admin guilds:', error);
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
