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
      // Disable features for all guilds
      const placeholders = items.map(() => '?').join(',');
      
      await query(
        `UPDATE guild_features SET enabled = 0 WHERE feature_key IN (${placeholders})`,
        items
      );
      
    } else if (type === 'commands') {
      // Disable commands for all guilds (via slash_command_permissions)
      const placeholders = items.map(() => '?').join(',');
      
      await query(
        `UPDATE slash_command_permissions SET enabled = 0 WHERE command_name IN (${placeholders})`,
        items
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "features" or "commands"' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Bulk disabled ${items.length} ${type} for all guilds`
    });
  } catch (error) {
    console.error('Error bulk disabling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk disable' },
      { status: 500 }
    );
  }
}
