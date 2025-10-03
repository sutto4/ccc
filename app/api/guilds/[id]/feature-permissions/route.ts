import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guildId = (await params).id;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if guild exists
    const guildRows = await query(
      'SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1',
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const featureKey = searchParams.get('feature');

    let whereClause = 'WHERE frp.guild_id = ?';
    let queryParams: any[] = [guildId];

    if (featureKey) {
      whereClause += ' AND frp.feature_key = ?';
      queryParams.push(featureKey);
    }

    // Get feature role permissions
    const permissions = await query(`
      SELECT 
        frp.guild_id,
        frp.feature_key,
        frp.role_id,
        frp.allowed,
        f.feature_name,
        f.description
      FROM feature_role_permissions frp
      JOIN features f ON frp.feature_key = f.feature_key
      ${whereClause}
      ORDER BY f.feature_name, frp.role_id
    `, queryParams);

    // Group permissions by feature
    const groupedPermissions: Record<string, any> = {};
    permissions.forEach((perm: any) => {
      if (!groupedPermissions[perm.feature_key]) {
        groupedPermissions[perm.feature_key] = {
          feature_key: perm.feature_key,
          feature_name: perm.feature_name,
          description: perm.description,
          roles: []
        };
      }
      groupedPermissions[perm.feature_key].roles.push({
        role_id: perm.role_id,
        allowed: perm.allowed
      });
    });

    return NextResponse.json({
      permissions: Object.values(groupedPermissions)
    });

  } catch (error) {
    console.error('Error fetching feature permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await authMiddleware(request as any);
    if (auth.error || !auth.user) {
      return createAuthResponse(auth.error || 'Unauthorized');
    }

    const guildId = (await params).id;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if guild exists
    const guildRows = await query(
      'SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1',
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    const body = await request.json();
    const { feature_key, role_permissions } = body;

    if (!feature_key || !Array.isArray(role_permissions)) {
      return NextResponse.json({ 
        error: 'feature_key and role_permissions array are required' 
      }, { status: 400 });
    }

    // Validate feature exists
    const featureRows = await query(
      'SELECT feature_key FROM features WHERE feature_key = ? AND is_active = 1 LIMIT 1',
      [feature_key]
    );

    if (!Array.isArray(featureRows) || featureRows.length === 0) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // Update role permissions
    for (const rolePerm of role_permissions) {
      const { role_id, allowed } = rolePerm;
      
      if (!role_id || typeof allowed !== 'boolean') {
        return NextResponse.json({ 
          error: 'Each role permission must have role_id and allowed (boolean)' 
        }, { status: 400 });
      }

      // Insert or update permission
      await query(`
        INSERT INTO feature_role_permissions (guild_id, feature_key, role_id, allowed)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          allowed = VALUES(allowed),
          updated_at = CURRENT_TIMESTAMP
      `, [guildId, feature_key, role_id, allowed]);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating feature permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await authMiddleware(request as any);
    if (auth.error || !auth.user) {
      return createAuthResponse(auth.error || 'Unauthorized');
    }

    const guildId = (await params).id;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const featureKey = searchParams.get('feature');
    const roleId = searchParams.get('role_id');

    if (!featureKey) {
      return NextResponse.json({ error: 'feature parameter is required' }, { status: 400 });
    }

    let whereClause = 'WHERE guild_id = ? AND feature_key = ?';
    let queryParams: any[] = [guildId, featureKey];

    if (roleId) {
      whereClause += ' AND role_id = ?';
      queryParams.push(roleId);
    }

    // Delete permissions
    await query(`
      DELETE FROM feature_role_permissions 
      ${whereClause}
    `, queryParams);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting feature permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
