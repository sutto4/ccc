import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const GET = async () => {
  try {
    // Check what's in server_groups table
    const [serverGroups] = await query('SELECT * FROM server_groups ORDER BY id');
    
    // Check what's in server_group_members table
    const [serverGroupMembers] = await query('SELECT * FROM server_group_members ORDER BY id');
    
    // Check what guilds exist
    const [guilds] = await query('SELECT guild_id, guild_name FROM guilds ORDER BY guild_id');

    return NextResponse.json({
      serverGroups,
      serverGroupMembers,
      guilds,
      summary: {
        totalGroups: serverGroups.length,
        totalMemberships: serverGroupMembers.length,
        totalGuilds: guilds.length
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
};

