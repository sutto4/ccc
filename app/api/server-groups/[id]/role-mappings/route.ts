import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/authz';
import { v4 as uuidv4 } from 'uuid';

// GET - Fetch all role mappings for a server group
export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, auth) => {
  const { id: groupId } = await params;
  
  console.log('[Role Mappings API] GET request for groupId:', groupId);
  console.log('[Role Mappings API] Auth context:', { discordId: auth.discordId, isValid: auth.isValid });

  try {
    // Get role mappings with their targets in a single query
    console.log('[Role Mappings API] Executing SQL query for groupId:', groupId);
    const result = await query(`
      SELECT 
        rm.*,
        COALESCE(
          JSON_ARRAYAGG(
            CASE 
              WHEN rmt.id IS NOT NULL THEN
                JSON_OBJECT(
                  'id', rmt.id,
                  'serverId', rmt.target_server_id,
                  'roleId', rmt.target_role_id,
                  'targetRoleName', rmt.target_role_name,
                  'serverName', g.guild_name
                )
              ELSE NULL
            END
          ),
          JSON_ARRAY()
        ) as targets
      FROM role_mappings rm
      LEFT JOIN role_mapping_targets rmt ON rm.id = rmt.mapping_id
      LEFT JOIN guilds g ON rmt.target_server_id = g.guild_id
      WHERE rm.group_id = ?
      GROUP BY rm.id
      ORDER BY rm.created_at DESC
    `, [groupId]);
    
    console.log('[Role Mappings API] Raw query result:', result);
    console.log('[Role Mappings API] Result type:', typeof result);
    console.log('[Role Mappings API] Result length:', Array.isArray(result) ? result.length : 'not array');
    
    // Handle the result properly - it might be an array of rows
    const mappings = Array.isArray(result) ? result : [result];
    console.log('[Role Mappings API] Processed mappings:', mappings);

    // mappings is already an array of role mappings
    const mappingsArray = mappings;
    
    // Debug each mapping's targets
    mappingsArray.forEach((mapping, index) => {
      console.log(`[Role Mappings API] Mapping ${index}:`, {
        id: mapping.id,
        primaryRoleName: mapping.primary_role_name,
        targets: mapping.targets,
        targetsType: typeof mapping.targets,
        targetsLength: Array.isArray(mapping.targets) ? mapping.targets.length : 'not array'
      });
    });

    // Process the results
    const processedMappings = mappingsArray.map((mapping: any) => {
      console.log('[Role Mappings API] Processing mapping:', mapping);
      console.log('[Role Mappings API] Mapping targets:', mapping.targets);
      
      const processed = {
        id: mapping.id,
        groupId: mapping.group_id,
        primaryServerId: mapping.primary_server_id,
        primaryRoleId: mapping.primary_role_id,
        primaryRoleName: mapping.primary_role_name,
        targetMappings: Array.isArray(mapping.targets) ? mapping.targets.filter((t: any) => t.id !== null) : [],
        createdAt: mapping.created_at,
        updatedAt: mapping.updated_at,
        createdBy: mapping.created_by
      };
      
      console.log('[Role Mappings API] Processed mapping:', processed);
      return processed;
    });

    return NextResponse.json({
      success: true,
      mappings: processedMappings
    });

  } catch (error) {
    console.error('[Role Mappings API] Error fetching role mappings:', error);
    console.error('[Role Mappings API] Error details:', {
      message: error.message,
      stack: error.stack,
      groupId
    });
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch role mappings',
      details: error.message 
    }, { status: 500 });
  }
}, { requiredPermissions: ['VIEW_SERVER_GROUPS'] });

// POST - Create a new role mapping
export const POST = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, auth) => {
  const { id: groupId } = await params;
  const body = await req.json();
  
  const {
    primaryServerId,
    primaryRoleId,
    primaryRoleName,
    targetMappings
  } = body;

  if (!primaryServerId || !primaryRoleId || !primaryRoleName || !targetMappings?.length) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing required fields' 
    }, { status: 400 });
  }

  const mappingId = uuidv4();
  const userId = auth.discordId || '351321199059533826'; // Fallback for debugging

  try {
    // Insert main mapping
    await query(`
      INSERT INTO role_mappings (
        id, group_id, primary_server_id, primary_role_id, primary_role_name, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [mappingId, groupId, primaryServerId, primaryRoleId, primaryRoleName, userId]);

    // Insert target mappings
    for (const target of targetMappings) {
      const targetId = uuidv4();
      await query(`
        INSERT INTO role_mapping_targets (
          id, mapping_id, target_server_id, target_role_id, target_role_name
        ) VALUES (?, ?, ?, ?, ?)
      `, [targetId, mappingId, target.serverId, target.roleId, target.roleName]);
    }

    return NextResponse.json({
      success: true,
      mapping: {
        id: mappingId,
        groupId,
        primaryServerId,
        primaryRoleId,
        primaryRoleName,
        targetMappings,
        createdAt: new Date().toISOString(),
        createdBy: userId
      }
    });

  } catch (error) {
    console.error('Error creating role mapping:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create role mapping' 
    }, { status: 500 });
  }
}, { requiredPermissions: ['MANAGE_SERVER_GROUPS'] });

// DELETE - Delete a role mapping
export const DELETE = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, auth) => {
  const { id: groupId } = await params;
  const { searchParams } = new URL(req.url);
  const mappingId = searchParams.get('mappingId');

  if (!mappingId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Mapping ID is required' 
    }, { status: 400 });
  }

  try {
    // Delete mapping (targets will be deleted via CASCADE)
    const [result] = await query(
      'DELETE FROM role_mappings WHERE id = ? AND group_id = ?',
      [mappingId, groupId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Mapping not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Role mapping deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting role mapping:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete role mapping' 
    }, { status: 500 });
  }
}, { requiredPermissions: ['MANAGE_SERVER_GROUPS'] });
