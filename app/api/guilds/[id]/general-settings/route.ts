import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    const url = new URL(request.url);
    const guildId = url.pathname.split('/')[3]; // Extract guild ID from /api/guilds/[id]/general-settings
    
    if (!guildId) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      );
    }

    // Fetch guild general settings
    const guildRow = await query(
      'SELECT mod_channel_id FROM guilds WHERE guild_id = ?',
      [guildId]
    ) as any[];

    if (guildRow.length === 0) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      );
    }

    const guild = guildRow[0];

    return NextResponse.json({
      modChannelId: guild.mod_channel_id || '',
    });

  } catch (error) {
    console.error('[GENERAL-SETTINGS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch general settings' },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    const url = new URL(request.url);
    const guildId = url.pathname.split('/')[3]; // Extract guild ID from /api/guilds/[id]/general-settings
    const body = await request.json();
    const { modChannelId } = body;

    if (!guildId) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      );
    }

    // Update guild general settings
    await query(
      'UPDATE guilds SET mod_channel_id = ? WHERE guild_id = ?',
      [modChannelId || null, guildId]
    );

    return NextResponse.json({ 
      success: true,
      message: 'General settings updated successfully'
    });

  } catch (error) {
    console.error('[GENERAL-SETTINGS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update general settings' },
      { status: 500 }
    );
  }
};
