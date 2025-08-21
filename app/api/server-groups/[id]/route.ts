import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authz';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const groupId = parseInt(params.id);
      if (isNaN(groupId)) {
        return NextResponse.json(
          { error: 'Invalid group ID' },
          { status: 400 }
        );
      }

      // Get group details and verify ownership
      const [group] = await query(`
        SELECT 
          id, name, description, created_at, updated_at
        FROM server_groups 
        WHERE id = ? AND owner_user_id = ?
      `, [groupId, auth.discordId]);

      if (!group) {
        return NextResponse.json(
          { error: 'Group not found or access denied' },
          { status: 404 }
        );
      }

      // Get servers in this group
      const servers = await query(`
        SELECT 
          g.guild_id,
          g.guild_name,
          g.premium,
          sgm.added_at,
          sgm.added_by
        FROM server_group_members sgm
        JOIN guilds g ON sgm.guild_id = g.guild_id
        WHERE sgm.group_id = ?
        ORDER BY g.guild_name
      `, [groupId]);

      return NextResponse.json({ 
        group: { ...group, server_count: servers.length },
        servers 
      });
    } catch (error) {
      console.error('Error fetching server group:', error);
      return NextResponse.json(
        { error: 'Failed to fetch server group' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const groupId = parseInt(params.id);
      if (isNaN(groupId)) {
        return NextResponse.json(
          { error: 'Invalid group ID' },
          { status: 400 }
        );
      }

      const { name, description } = await request.json();

      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Group name is required' },
          { status: 400 }
        );
      }

      // Update the group (only if owner)
      const result = await query(`
        UPDATE server_groups 
        SET name = ?, description = ?
        WHERE id = ? AND owner_user_id = ?
      `, [name.trim(), description?.trim() || null, groupId, auth.discordId]);

      if ((result as any).affectedRows === 0) {
        return NextResponse.json(
          { error: 'Group not found or access denied' },
          { status: 404 }
        );
      }

      // Fetch the updated group
      const [group] = await query(`
        SELECT id, name, description, created_at, updated_at
        FROM server_groups 
        WHERE id = ?
      `, [groupId]);

      return NextResponse.json({ group });
    } catch (error) {
      console.error('Error updating server group:', error);
      return NextResponse.json(
        { error: 'Failed to update server group' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (auth) => {
    try {
      const groupId = parseInt(params.id);
      if (isNaN(groupId)) {
        return NextResponse.json(
          { error: 'Invalid group ID' },
          { status: 400 }
        );
      }

      // Delete the group (only if owner) - this will cascade to members
      const result = await query(`
        DELETE FROM server_groups 
        WHERE id = ? AND owner_user_id = ?
      `, [groupId, auth.discordId]);

      if ((result as any).affectedRows === 0) {
        return NextResponse.json(
          { error: 'Group not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting server group:', error);
      return NextResponse.json(
        { error: 'Failed to delete server group' },
        { status: 500 }
      );
    }
  });
}
