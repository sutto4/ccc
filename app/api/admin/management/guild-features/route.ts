import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const guildFeatures = await query(`
      SELECT 
        gf.id,
        gf.guild_id,
        gf.feature_key,
        gf.enabled,
        gf.created_at,
        gf.updated_at,
        g.guild_name,
        f.feature_name as feature_display_name
      FROM guild_features gf
      LEFT JOIN guilds g ON gf.guild_id = g.guild_id
      LEFT JOIN features f ON gf.feature_key = f.feature_key
      ORDER BY gf.guild_id, gf.feature_key
    `);
    
    return NextResponse.json({
      success: true,
      guildFeatures
    });
  } catch (error) {
    console.error('Error fetching guild features:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guild features' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { guild_id, feature_key, enabled } = await request.json();
    
    if (!guild_id || !feature_key) {
      return NextResponse.json(
        { success: false, error: 'guild_id and feature_key are required' },
        { status: 400 }
      );
    }
    
    await query(
      'INSERT INTO guild_features (guild_id, feature_key, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = ?',
      [guild_id, feature_key, enabled !== false, enabled !== false]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Guild feature created/updated successfully'
    });
  } catch (error) {
    console.error('Error creating guild feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create guild feature' },
      { status: 500 }
    );
  }
}
