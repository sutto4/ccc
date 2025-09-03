import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guildId = params.id;
    
    // Try to proxy the request to the bot server
    try {
      const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
      const botResponse = await fetch(`${botUrl}/api/guilds/${guildId}/commands`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (botResponse.ok) {
        const data = await botResponse.json();
        return NextResponse.json(data);
      }
    } catch (botError) {
      console.error('Bot server not available, using fallback:', botError);
    }
    
    // Fallback: Fetch from database directly
    console.log('🚨🚨🚨 USING FALLBACK FOR GET COMMANDS! 🚨🚨🚨');
    const { query } = await import('@/lib/db');
    
    // Get all available commands with their current state
    const commands = [
      { name: 'warn', enabled: false },
      { name: 'kick', enabled: false },
      { name: 'ban', enabled: false },
      { name: 'mute', enabled: false },
      { name: 'unmute', enabled: false },
      { name: 'role', enabled: false },
      { name: 'custom', enabled: false },
      { name: 'sendverify', enabled: false },
      { name: 'setverifylog', enabled: false },
      { name: 'setmodlog', enabled: false },
      { name: 'feedback', enabled: false },
      { name: 'embed', enabled: false }
    ];
    
    // Check which commands are enabled in the database
    for (const cmd of commands) {
      try {
        const result = await query(
          'SELECT enabled FROM guild_commands WHERE guild_id = ? AND command_name = ?',
          [guildId, cmd.name]
        );
        if (result && result.length > 0) {
          cmd.enabled = result[0].enabled === 1;
        }
      } catch (dbError) {
        console.error(`Error checking command ${cmd.name}:`, dbError);
      }
    }
    
    return NextResponse.json({ commands });

  } catch (error) {
    console.error('Error fetching guild commands:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guildId = params.id;
  let body: any;
  
  try {
    body = await request.json();
    
    console.log(`[WEB-APP] Received command update request for guild ${guildId}:`, body);
    console.log(`[WEB-APP] Attempting to connect to bot server at: http://127.0.0.1:3001/api/guilds/${guildId}/commands`);
    
    // First, test if the bot server is reachable
    try {
      const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
      const healthResponse = await fetch(`${botUrl}/api/commands/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[WEB-APP] Bot server health check status: ${healthResponse.status}`);
    } catch (healthError) {
      console.error(`[WEB-APP] Bot server health check failed:`, healthError);
    }
    
    // Proxy the request to the bot server
    const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
    const botResponse = await fetch(`${botUrl}/api/guilds/${guildId}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`[WEB-APP] Bot server response status: ${botResponse.status}`);

    if (!botResponse.ok) {
      const errorText = await botResponse.text();
      console.error(`Bot server responded with status: ${botResponse.status}, error: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to update guild commands', details: errorText },
        { status: botResponse.status }
      );
    }

    const data = await botResponse.json();
    console.log(`[WEB-APP] Bot server response data:`, data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('🚨🚨🚨 ERROR UPDATING GUILD COMMANDS! 🚨🚨🚨');
    console.error('Error updating guild commands:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });
    
    // Fallback: Update database directly when bot server is not available
    console.log('🚨🚨🚨 BOT SERVER NOT AVAILABLE - USING FALLBACK! 🚨🚨🚨');
    try {
      const { query } = await import('@/lib/db');
      const commands = body.commands;
      
      console.log('🚨🚨🚨 FALLBACK: Commands to update:', commands);
      console.log('🚨🚨🚨 FALLBACK: query function imported:', !!query);
      
      if (!Array.isArray(commands)) {
        return NextResponse.json(
          { error: 'Commands must be an array' },
          { status: 400 }
        );
      }
      
      // Update each command in the database
      for (const cmd of commands) {
        console.log(`[FALLBACK] Updating command ${cmd.command_name} to ${cmd.enabled ? 'enabled' : 'disabled'}`);
        const result = await query(
          `INSERT INTO guild_commands (guild_id, command_name, enabled, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           enabled = VALUES(enabled), 
           updated_at = NOW()`,
          [guildId, cmd.command_name, cmd.enabled ? 1 : 0]
        );
        console.log(`[FALLBACK] Database result for ${cmd.command_name}:`, result);
      }
      
      console.log('🚨🚨🚨 FALLBACK SUCCESS! 🚨🚨🚨');
      return NextResponse.json({ 
        success: true, 
        message: `Updated ${commands.length} commands (fallback mode - bot server not available)`,
        fallback: true
      });
      
    } catch (fallbackError) {
      console.error('🚨🚨🚨 FALLBACK ALSO FAILED! 🚨🚨🚨');
      console.error('Fallback error:', fallbackError);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
}
