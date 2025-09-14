import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { type, items } = await request.json();
    
    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'type and items array are required' },
        { status: 400 }
      );
    }
    
    if (type === 'features') {
      // Enable features for all guilds
      // First, get all guild IDs
      const guilds = await query('SELECT guild_id FROM guilds');
      
      // Insert/update guild_features for each guild and feature
      for (const guild of guilds) {
        for (const feature of items) {
          await query(
            'INSERT INTO guild_features (guild_id, feature_key, enabled) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE enabled = 1',
            [guild.guild_id, feature]
          );
        }
      }
      
    } else if (type === 'commands') {
      // Enable commands for all guilds (via slash_command_permissions)
      for (const command of items) {
        // Get all guild IDs
        const guilds = await query('SELECT guild_id FROM guilds');
        
        // Insert/update slash_command_permissions for each guild and command
        for (const guild of guilds) {
          await query(
            'INSERT INTO slash_command_permissions (guild_id, command_name, enabled) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE enabled = 1',
            [guild.guild_id, command]
          );
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "features" or "commands"' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Bulk enabled ${items.length} ${type} for all guilds`
    });
  } catch (error) {
    console.error('Error bulk enabling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk enable' },
      { status: 500 }
    );
  }
}
