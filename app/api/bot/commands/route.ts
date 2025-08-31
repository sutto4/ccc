import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    // Parse request body
    const body = await req.json();
    const { guildId, action, features } = body;
    
    if (!guildId || !action || !features) {
      return NextResponse.json({ 
        error: "Missing required fields: guildId, action, features" 
      }, { status: 400 });
    }

    console.log(`[BOT-COMMANDS] ${action} commands for guild ${guildId}:`, features);

    // Return success - the bot will handle the actual Discord API calls
    return NextResponse.json({ 
      success: true, 
      message: `Commands ${action} for guild ${guildId}`,
      guildId,
      action,
      features
    });

  } catch (error) {
    console.error('[BOT-COMMANDS] Error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');
    
    if (!guildId) {
      return NextResponse.json({ 
        error: "Missing guildId parameter" 
      }, { status: 400 });
    }

    // Get enabled features for the guild
    let mysql: any;
    try {
      ({ default: mysql } = await import("mysql2/promise"));
    } catch {
      return NextResponse.json({ error: "Database driver not installed" }, { status: 500 });
    }

    const connection = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    });

    try {
      const [featuresResult] = await connection.execute(
        `SELECT feature_name FROM guild_features WHERE guild_id = ? AND enabled = 1`,
        [guildId]
      );
      
      const enabledFeatures = featuresResult.map((row: any) => row.feature_name);
      
      return NextResponse.json({ 
        success: true,
        guildId,
        enabledFeatures
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('[BOT-COMMANDS-GET] Error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
