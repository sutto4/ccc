import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Check if features table exists
    let featuresResult;
    try {
      featuresResult = await query('SELECT * FROM features ORDER BY feature_name');
    } catch (error) {
      return NextResponse.json({ 
        error: "Features table does not exist",
        message: "You need to create the features table first"
      }, { status: 404 });
    }

    // Check if guild_features table exists and has data
    let guildFeaturesResult;
    try {
      guildFeaturesResult = await query('SELECT * FROM guild_features ORDER BY guild_id, feature_name');
    } catch (error) {
      guildFeaturesResult = { error: 'Table does not exist' };
    }

    return NextResponse.json({
      message: "Features table contents",
      featuresTable: {
        exists: true,
        count: Array.isArray(featuresResult) ? featuresResult.length : 0,
        features: featuresResult || []
      },
      guildFeaturesTable: {
        exists: !guildFeaturesResult.error,
        count: guildFeaturesResult.error ? 0 : (Array.isArray(guildFeaturesResult) ? guildFeaturesResult.length : 0),
        guildFeatures: guildFeaturesResult.error ? [] : guildFeaturesResult || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in debug features endpoint:', error);
    return NextResponse.json({ 
      error: "Failed to get features info",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
