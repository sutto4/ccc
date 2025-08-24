import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: guildId } = await params;
    
    // Try to get the guild name from the user's guilds list
    // This requires the user to have access to the guild
    try {
      const userGuildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { 
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (userGuildsResponse.ok) {
        const userGuilds = await userGuildsResponse.json();
        const guild = userGuilds.find((g: any) => g.id === guildId);
        
        if (guild) {
          return NextResponse.json({
            id: guildId,
            name: guild.name,
            iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png` : null
          });
        }
      }
    } catch (discordError) {
      console.error('Failed to fetch from Discord API:', discordError);
      // Fall through to generic response
    }
    
    // Fallback: return basic guild info if Discord API fails
    return NextResponse.json({
      id: guildId,
      name: `Server ${guildId}`,
      iconUrl: null
    });
  } catch (error) {
    console.error('Error fetching guild info:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
