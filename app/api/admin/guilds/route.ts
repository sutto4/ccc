
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
        premium
      FROM guilds 
      LIMIT 100
    `);

    console.log('Guilds query result:', guilds);

    // Transform the data to match the dashboard interface
    const transformedGuilds = guilds.map((guild: any) => ({
      id: guild.guild_id,
      name: guild.guild_name || guild.guild_id,
      icon_url: null, // We'll add this later when we confirm the column exists
      member_count: 0, // We'll add this later when we have member count data
      premium: Boolean(guild.premium),
      status: 'active', // Default to active for now
      joined_at: new Date().toISOString(), // Default to now for now
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
