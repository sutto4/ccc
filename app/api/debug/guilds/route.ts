import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Check if database is accessible
    const guildsResult = await query(
      `SELECT guild_id, guild_name, premium, created_at FROM guilds ORDER BY created_at DESC LIMIT 10`
    );

    let guilds = guildsResult;
    if (Array.isArray(guildsResult) && guildsResult.length > 0 && Array.isArray(guildsResult[0])) {
      guilds = guildsResult[0]; // MySQL2 returns [rows, fields] format
    }

    // Also check guild_features table
    const featuresResult = await query(
      `SELECT guild_id, feature_name, enabled FROM guild_features LIMIT 10`
    );

    let features = featuresResult;
    if (Array.isArray(featuresResult) && featuresResult.length > 0 && Array.isArray(featuresResult[0])) {
      features = featuresResult[0];
    }

    return NextResponse.json({
      message: "Database guild information",
      totalGuilds: Array.isArray(guilds) ? guilds.length : 0,
      guilds: guilds || [],
      totalFeatures: Array.isArray(features) ? features.length : 0,
      features: features || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debug guilds endpoint:', error);
    return NextResponse.json({ 
      error: "Failed to get guild info",
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}
