import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/authz';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (auth) => {
    try {
      const { id } = await params;
      const { guildId } = await request.json();

      if (!guildId) {
        return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
      }

      const userId = auth.discordId || '351321199059533826'; // Fallback for debugging
      const groupId = parseInt(id);
      
      if (isNaN(groupId)) {
        return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
      }

      // Verify user owns the group
      const [group] = await query(`
        SELECT id FROM server_groups 
        WHERE id = ? AND owner_user_id = ?
      `, [groupId, userId]);

      if (!group) {
        return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
      }

      // Verify the guild is in this group
      const [membership] = await query(`
        SELECT guild_id FROM server_group_members 
        WHERE group_id = ? AND guild_id = ?
      `, [groupId, guildId]);

      if (!membership) {
        return NextResponse.json({ error: 'Server is not in this group' }, { status: 400 });
      }

      // First, set all servers in this group to not primary
      await query(`
        UPDATE server_group_members 
        SET is_primary = 0
        WHERE group_id = ?
      `, [groupId]);

      // Then set the selected server as primary
      await query(`
        UPDATE server_group_members 
        SET is_primary = 1
        WHERE group_id = ? AND guild_id = ?
      `, [groupId, guildId]);

      console.log('[SET-PRIMARY] Server', guildId, 'set as primary for group', groupId);

      return NextResponse.json({ 
        success: true, 
        message: 'Primary server updated successfully' 
      });

    } catch (error) {
      console.error('[SET-PRIMARY] Error setting primary server:', error);
      return NextResponse.json({ error: 'Failed to set primary server' }, { status: 500 });
    }
  })(request);
}
