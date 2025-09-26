import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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
    const { id } = await params;
    const groupId = parseInt(id);
    console.log('[SERVER-GROUP-DETAIL] Fetching group:', groupId, 'for user:', discordId);
    
    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    // Get group details and verify ownership
    const [group] = await query(`
      SELECT 
        id, name, description, icon_url, created_at, updated_at
      FROM server_groups 
      WHERE id = ? AND owner_user_id = ?
      `, [groupId, discordId]);

    if (!group) {
      console.log('[SERVER-GROUP-DETAIL] Group not found or access denied for group:', groupId, 'user:', discordId);
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      );
    }
    
    console.log('[SERVER-GROUP-DETAIL] Found group:', group);

    // Get servers in this group
    const servers = await query(`
      SELECT 
        g.guild_id,
        g.guild_name,
        g.member_count,
        g.icon_url,
        sgm.added_at,
        sgm.added_by,
        sgm.is_primary
      FROM server_group_members sgm
      JOIN guilds g ON sgm.guild_id = g.guild_id
      WHERE sgm.group_id = ?
      ORDER BY sgm.added_at ASC
    `, [groupId]);

    console.log('[SERVER-GROUP-DETAIL] Servers found:', servers);
    servers.forEach((server, index) => {
      console.log(`[SERVER-GROUP-DETAIL] Server ${index}:`, {
        guild_id: server.guild_id,
        guild_name: server.guild_name,
        is_primary: server.is_primary
      });
    });

    // Get user's subscription plan to determine limits
    let userPlan = 'free';
    let serverLimitPerGroup = 0;
    
    try {
      const userPlanResult = await query(`
        SELECT DISTINCT g.product_name
        FROM guilds g
        JOIN server_access_control sac ON g.guild_id = sac.guild_id
        WHERE sac.user_id = ? AND sac.has_access = 1 AND g.product_name IS NOT NULL
        ORDER BY 
          CASE g.product_name
            WHEN 'Network' THEN 3
            WHEN 'City' THEN 2
            WHEN 'Squad' THEN 1
            ELSE 0
          END DESC
        LIMIT 1
      `, [discordId]);
      
      if (userPlanResult.length > 0) {
        userPlan = userPlanResult[0].product_name.toLowerCase();
      }
      
      // Set limits based on plan
      switch (userPlan) {
        case 'network':
          serverLimitPerGroup = -1; // Unlimited
          break;
        case 'city':
          serverLimitPerGroup = 10;
          break;
        case 'squad':
          serverLimitPerGroup = 3;
          break;
        default:
          serverLimitPerGroup = 0;
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }

    return NextResponse.json({
      group: { 
        ...group, 
        server_count: servers.length,
        server_limit: serverLimitPerGroup,
        user_plan: userPlan
      },
      servers: servers.map(server => ({
        ...server,
        is_online: true // Default to online since we don't have last_seen data
      }))
    });
  } catch (error) {
    console.error('Error fetching server group:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server group' },
      { status: 500 }
    );
  }
};

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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
    const { id } = await params;
    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return NextResponse.json(
        { error: 'Invalid group ID' },
        { status: 400 }
      );
    }

    const { name, description, iconUrl } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Update the group (only if owner)
    const result = await query(`
      UPDATE server_groups 
      SET name = ?, description = ?, icon_url = ?
      WHERE id = ? AND owner_user_id = ?
    `, [name.trim(), description?.trim() || null, iconUrl?.trim() || null, groupId, discordId]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Group not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the updated group
    const [group] = await query(`
      SELECT id, name, description, icon_url, created_at, updated_at
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
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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
    const { id } = await params;
    const groupId = parseInt(id);
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
    `, [groupId, discordId]);

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
};
