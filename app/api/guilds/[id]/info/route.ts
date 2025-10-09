import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET guild info including group membership
export const GET = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  
  try {
    // Get guild basic info
    const [guildRows] = await query(
      `SELECT guild_id, guild_name, owner_id, status 
       FROM guilds 
       WHERE guild_id = ? 
       LIMIT 1`,
      [guildId]
    ) as any[];

    if (!guildRows) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Check if guild is part of a group
    const groupRows = await query(
      `SELECT sg.id, sg.name, sg.description
       FROM server_groups sg
       JOIN server_group_members sgm ON sg.id = sgm.group_id
       WHERE sgm.guild_id = ?
       LIMIT 1`,
      [guildId]
    ) as any[];

    const group = groupRows.length > 0 ? {
      id: groupRows[0].id,
      name: groupRows[0].name,
      description: groupRows[0].description
    } : null;

    return NextResponse.json({
      guild: {
        id: guildRows.guild_id,
        name: guildRows.guild_name,
        ownerId: guildRows.owner_id,
        premium: guildRows.status === 'premium',
        group: group
      }
    });
  } catch (error) {
    console.error('Error fetching guild info:', error);
    return NextResponse.json({ error: 'Failed to fetch guild info' }, { status: 500 });
  }
};


