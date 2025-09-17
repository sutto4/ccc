import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guildId } = await params;
    
    // Try to proxy the request to the bot server
    try {
      const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
      const botResponse = await fetch(`${botUrl}/api/guilds/${guildId}/command-permissions`, {
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
    
    // Fallback: Generate command permissions from database
    console.log('🚨🚨🚨 USING FALLBACK FOR COMMAND PERMISSIONS! 🚨🚨🚨');
    const { query } = await import('@/lib/db');
    
    // Get all available commands from the command_mappings table
    const allCommandsFromDb = await query(
      'SELECT command_name, feature_key FROM command_mappings ORDER BY feature_key, command_name'
    );
    
    console.log('🚨🚨🚨 ALL COMMANDS FROM DB:', allCommandsFromDb);
    
    // Convert to the format expected by the rest of the code
    const allCommands = allCommandsFromDb.map((cmd: any) => ({
      name: cmd.command_name,
      category: cmd.feature_key
    }));
    
    // Ensure setmodlog is included if it exists in the database
    const setmodlogExists = allCommandsFromDb.some((cmd: any) => cmd.command_name === 'setmodlog');
    console.log('🚨🚨🚨 SETMODLOG EXISTS IN DB:', setmodlogExists);
    
    // Get admin-enabled features for this guild
    const adminFeatures = await query(
      'SELECT feature_key FROM guild_features WHERE guild_id = ? AND enabled = 1',
      [guildId]
    );
    
    console.log('🚨🚨🚨 ADMIN FEATURES FROM DB:', adminFeatures);
    
    // Get guild-enabled commands with feature information
    const guildCommands = await query(
      'SELECT command_name, feature_key, enabled FROM guild_commands WHERE guild_id = ?',
      [guildId]
    );
    
    console.log('🚨🚨🚨 GUILD COMMANDS FROM DB:', guildCommands);
    
    const adminEnabledFeatures = adminFeatures.map((f: any) => f.feature_key);
    const guildCommandMap = new Map();
    const commandFeatureMap = new Map();
    
    guildCommands.forEach((cmd: any) => {
      guildCommandMap.set(cmd.command_name, cmd.enabled === 1);
      commandFeatureMap.set(cmd.command_name, cmd.feature_key);
    });
    
    console.log('🚨🚨🚨 ADMIN ENABLED FEATURES:', adminEnabledFeatures);
    console.log('🚨🚨🚨 GUILD COMMAND MAP:', Object.fromEntries(guildCommandMap));
    console.log('🚨🚨🚨 COMMAND FEATURE MAP:', Object.fromEntries(commandFeatureMap));
    
    // Build command permissions
    const commands: Record<string, any> = {};
    allCommands.forEach(cmd => {
      // Check if command exists in guild_commands table
      const existsInGuildCommands = guildCommandMap.has(cmd.name);
      const commandFeature = commandFeatureMap.get(cmd.name) || cmd.category;
      
      // Admin enabled = command exists in guild_commands AND enabled = 1
      // OR the parent feature is enabled in guild_features
      const isFeatureEnabled = adminEnabledFeatures.includes(commandFeature);
      const isCommandEnabledByAdmin = existsInGuildCommands && guildCommandMap.get(cmd.name);
      const isAdminEnabled = isCommandEnabledByAdmin || isFeatureEnabled;
      
      // Guild enabled = command is enabled in guild_commands (if admin has made it available)
      const isGuildEnabled = guildCommandMap.get(cmd.name) || false;
      

      
      commands[cmd.name] = {
        adminEnabled: isAdminEnabled,
        guildEnabled: isGuildEnabled,
        canModify: isAdminEnabled, // Guild can only modify if admin has enabled it
        feature: commandFeature
      };
    });
    
    console.log('🚨🚨🚨 FINAL COMMANDS PERMISSIONS:', commands);
    console.log('🚨🚨🚨 SETMODLOG IN FINAL COMMANDS:', commands.setmodlog);
    
    return NextResponse.json({
      commands,
      features: {
        moderation: adminEnabledFeatures.includes('moderation'),
        utilities: adminEnabledFeatures.includes('utilities')
      }
    });

  } catch (error) {
    console.error('Error fetching command permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
