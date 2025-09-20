import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Function to notify Discord bot of bulk changes
async function notifyBotBulkUpdate(type: 'features' | 'commands', items: string[], action: 'enable' | 'disable') {
  try {
    const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
    const response = await fetch(`${botUrl}/api/admin/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        type,
        items,
        action,
        timestamp: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      console.log(`[BULK-${action.toUpperCase()}] Bot notification sent successfully for ${items.length} ${type}`);
    } else {
      console.warn(`[BULK-${action.toUpperCase()}] Bot notification failed:`, response.status);
    }
  } catch (error) {
    console.error(`[BULK-${action.toUpperCase()}] Error notifying bot:`, error);
  }
}

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
    
    // Notify Discord bot of bulk changes
    console.log(`[BULK-DISABLE] Notifying bot of bulk ${type} disable for ${items.length} items...`);
    await notifyBotBulkUpdate(type, items, 'disable');
    
    return NextResponse.json({
      success: true,
      message: `Bulk disabled ${items.length} ${type} for all guilds and bot notified`
    });
  } catch (error) {
    console.error('Error bulk disabling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk disable' },
      { status: 500 }
    );
  }
}
