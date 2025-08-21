import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/authz';
import { query } from '@/lib/db';

export const GET = withAuth(async (req: Request, _ctx: unknown, { discordId }) => {
  try {
    // Get all groups owned by the current user
    const groups = await query(`
      SELECT 
        sg.id,
        sg.name,
        sg.description,
        sg.created_at,
        sg.updated_at,
        COUNT(sgm.guild_id) as server_count
      FROM server_groups sg
      LEFT JOIN server_group_members sgm ON sg.id = sgm.group_id
      WHERE sg.owner_user_id = ?
      GROUP BY sg.id
      ORDER BY sg.created_at DESC
    `, [discordId]);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching server groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server groups' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: Request, _ctx: unknown, { discordId }) => {
  try {
    const { name, description } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Create the group
    const result = await query(`
      INSERT INTO server_groups (name, description, owner_user_id)
      VALUES (?, ?, ?)
    `, [name.trim(), description?.trim() || null, discordId]);

    const groupId = (result as any).insertId;

    // Fetch the created group
    const [group] = await query(`
      SELECT 
        id, name, description, created_at, updated_at
      FROM server_groups 
      WHERE id = ?
    `, [groupId]);

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Error creating server group:', error);
    return NextResponse.json(
      { error: 'Failed to create server group' },
      { status: 500 }
    );
  }
});
