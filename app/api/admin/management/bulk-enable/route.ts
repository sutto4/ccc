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
    
    // Notify Discord bot of bulk changes
    console.log(`[BULK-ENABLE] Notifying bot of bulk ${type} enable for ${items.length} items...`);
    await notifyBotBulkUpdate(type, items, 'enable');
    
    return NextResponse.json({
      success: true,
      message: `Bulk enabled ${items.length} ${type} for all guilds and bot notified`
    });
  } catch (error) {
    console.error('Error bulk enabling:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk enable' },
      { status: 500 }
    );
  }
}
