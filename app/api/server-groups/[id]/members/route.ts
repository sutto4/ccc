import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Simple auth validation
  const token = await getToken({
    req,
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
    const { id } = await params;
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const { guildId } = await req.json();
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Verify group ownership
    const [group] = await query(
      `SELECT id FROM server_groups WHERE id = ? AND owner_user_id = ?`,
      [groupId, discordId]
    );
    if (!group) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
    }

    // Verify the guild exists and user has access to it
    const [guild] = await query(
      `SELECT g.guild_id, g.guild_name FROM guilds g
       JOIN server_access_control sac ON g.guild_id = sac.guild_id
       WHERE g.guild_id = ? AND sac.user_id = ?`,
      [guildId, discordId]
    );
    if (!guild) {
      return NextResponse.json({ error: 'Guild not found or access denied' }, { status: 404 });
    }

    // Check if server is already in a group
    const [existingGroup] = await query(
      `SELECT sg.id, sg.name FROM server_groups sg
       JOIN server_group_members sgm ON sg.id = sgm.group_id
       WHERE sgm.guild_id = ?`,
      [guildId]
    );
    if (existingGroup) {
      return NextResponse.json({ error: `Server is already in group "${existingGroup.name}"` }, { status: 400 });
    }

    // Add server to group
    await query(
      `INSERT INTO server_group_members (group_id, guild_id, added_by) VALUES (?, ?, ?)`,
      [groupId, guildId, discordId]
    );
    await query(`UPDATE guilds SET group_id = ? WHERE guild_id = ?`, [groupId, guildId]);

    return NextResponse.json({ success: true, message: `Server "${(guild as any).guild_name}" added to group successfully` });
  } catch (error) {
    console.error('Error adding server to group:', error);
    return NextResponse.json({ error: 'Failed to add server to group' }, { status: 500 });
  }
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Simple auth validation
  const token = await getToken({
    req,
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

  const discordId = (token as any).discordId as string;

  if (!discordId) {
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
    const { id } = await params;
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const { guildId } = await req.json();
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    if (!discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify group ownership
    const [group] = await query(
      `SELECT id FROM server_groups WHERE id = ? AND owner_user_id = ?`,
      [groupId, discordId]
    );
    if (!group) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
    }

    // Remove server from group
    const result = await query(
      `DELETE FROM server_group_members WHERE group_id = ? AND guild_id = ?`,
      [groupId, guildId]
    );
    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Server not found in group' }, { status: 404 });
    }

    await query(`UPDATE guilds SET group_id = NULL WHERE guild_id = ?`, [guildId]);
    return NextResponse.json({ success: true, message: 'Server removed from group successfully' });
  } catch (error) {
    console.error('Error removing server from group:', error);
    return NextResponse.json({ error: 'Failed to remove server from group' }, { status: 500 });
  }
};
