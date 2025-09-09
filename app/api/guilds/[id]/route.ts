import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Simple auth validation
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token || !(token as any).discordId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        message: 'Please login to continue',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  const accessToken = (token as any).accessToken as string;
  const discordId = (token as any).discordId as string;

  if (!accessToken || !discordId) {
    return NextResponse.json(
      {
        error: 'Authentication expired',
        message: 'Please login again',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }
  try {
    const { id: guildId } = await params;

    // Try to get the guild name from the user's guilds list
    // This requires the user to have access to the guild
    try {
      const userGuildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
};