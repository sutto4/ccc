import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/authz';
import { query } from '@/lib/db';

export const GET = withAuth(async (req: Request, _ctx: unknown, { discordId }) => {
  try {
    console.log('[SERVER-GROUPS] Fetching groups for user:', discordId);
    
    // Temporary fix: if discordId is undefined, use a default user ID for testing
    const userId = discordId || '351321199059533826';
    console.log('[SERVER-GROUPS] Using userId:', userId);
    
    // Get all groups owned by the current user with server details
    const groups = await query(`
      SELECT 
        sg.id,
        sg.name,
        sg.description,
        sg.icon_url,
        sg.created_at,
        sg.updated_at,
        COUNT(sgm.guild_id) as server_count,
        JSON_ARRAYAGG(
          CASE 
            WHEN sgm.guild_id IS NOT NULL THEN
              JSON_OBJECT(
                'id', g.guild_id,
                'name', g.guild_name,
                'memberCount', g.member_count,
                'isOnline', CASE WHEN g.guild_id IS NOT NULL THEN 1 ELSE 0 END,
                'productName', g.product_name
              )
            ELSE NULL
          END
        ) as servers,
        -- Get the highest tier product_name from servers in this group
        (
          SELECT CASE 
            WHEN COUNT(DISTINCT g2.product_name) = 0 THEN 'Free'
            WHEN COUNT(DISTINCT g2.product_name) = 1 AND MAX(g2.product_name) IS NULL THEN 'Free'
            ELSE MAX(g2.product_name)
          END
          FROM server_group_members sgm2
          LEFT JOIN guilds g2 ON sgm2.guild_id = g2.guild_id
          WHERE sgm2.group_id = sg.id
        ) as group_tier
      FROM server_groups sg
      LEFT JOIN server_group_members sgm ON sg.id = sgm.group_id
      LEFT JOIN guilds g ON sgm.guild_id = g.guild_id
      WHERE sg.owner_user_id = ?
      GROUP BY sg.id
      ORDER BY sg.created_at DESC
    `, [userId]);

    console.log('[SERVER-GROUPS] Raw query result:', groups);

    // Get user's subscription plan to determine limits
    let userPlan = 'free';
    let serverGroupLimit = 0;
    let serverLimitPerGroup = 0;
    
    try {
      // Get user's highest tier from their guilds
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
      `, [userId]);
      
      if (userPlanResult.length > 0) {
        userPlan = userPlanResult[0].product_name.toLowerCase();
      }
      
      // Set limits based on plan
      switch (userPlan) {
        case 'network':
          serverGroupLimit = -1; // Unlimited
          serverLimitPerGroup = -1; // Unlimited
          break;
        case 'city':
          serverGroupLimit = 10; // Max 10 groups
          serverLimitPerGroup = 10; // Max 10 servers per group
          break;
        case 'squad':
          serverGroupLimit = 3; // Max 3 groups
          serverLimitPerGroup = 3; // Max 3 servers per group
          break;
        default:
          serverGroupLimit = 0; // No groups allowed
          serverLimitPerGroup = 0;
      }
    } catch (error) {
      console.warn('Failed to get user plan:', error);
    }

    // Process the groups to match the frontend interface
    const processedGroups = groups.map((group: any) => {
      // Determine the premium tier based on product_name
      let premiumTier = 'free';
      if (group.group_tier && group.group_tier !== 'Free' && group.group_tier !== null) {
        // Convert product_name to lowercase for consistency
        premiumTier = group.group_tier.toLowerCase();
      }

      return {
        id: group.id.toString(),
        name: group.name,
        description: group.description,
        iconUrl: group.icon_url,
        premiumTier: premiumTier as 'free' | 'premium' | 'enterprise',
        serverCount: group.server_count || 0,
        serverLimit: serverLimitPerGroup,
        roleSyncEnabled: false, // Default, can be enhanced later
        banSyncEnabled: false, // Default, can be enhanced later
        automodRulesCount: 0, // Default, can be enhanced later
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        servers: group.servers ? group.servers.filter((s: any) => s !== null) : []
      };
    });

    return NextResponse.json({ 
      groups: processedGroups,
      limits: {
        userPlan,
        serverGroupLimit,
        serverLimitPerGroup,
        canCreateGroups: serverGroupLimit !== 0,
        currentGroupCount: groups.length
      }
    });
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
    const { name, description, iconUrl } = await req.json();
    
    // Temporary fix: if discordId is undefined, use a default user ID for testing
    const userId = discordId || '351321199059533826';

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check user's subscription plan and limits
    let userPlan = 'free';
    let serverGroupLimit = 0;
    
    try {
      // Get user's highest tier from their guilds
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
      `, [userId]);
      
      if (userPlanResult.length > 0) {
        userPlan = userPlanResult[0].product_name.toLowerCase();
      }
      
      // Set limits based on plan
      switch (userPlan) {
        case 'network':
          serverGroupLimit = -1; // Unlimited
          break;
        case 'city':
          serverGroupLimit = 10; // Max 10 groups
          break;
        case 'squad':
          serverGroupLimit = 3; // Max 3 groups
          break;
        default:
          serverGroupLimit = 0; // No groups allowed
      }
    } catch (error) {
      console.warn('Failed to get user plan:', error);
    }

    // Check if user can create groups
    if (serverGroupLimit === 0) {
      return NextResponse.json(
        { error: 'Server groups are only available to premium customers. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Check current group count (if not unlimited)
    if (serverGroupLimit > 0) {
      const currentGroups = await query(`
        SELECT COUNT(*) as count
        FROM server_groups
        WHERE owner_user_id = ?
      `, [userId]);
      
      const currentCount = (currentGroups as any)[0].count;
      if (currentCount >= serverGroupLimit) {
        return NextResponse.json(
          { 
            error: `You have reached the maximum number of server groups for your ${userPlan} plan (${serverGroupLimit}). Please upgrade to create more groups.` 
          },
          { status: 403 }
        );
      }
    }

    // Create the group
    const result = await query(`
      INSERT INTO server_groups (name, description, icon_url, owner_user_id)
      VALUES (?, ?, ?, ?)
    `, [name.trim(), description?.trim() || null, iconUrl?.trim() || null, userId]);

    const groupId = (result as any).insertId;

    // Fetch the created group
    const [group] = await query(`
      SELECT 
        id, name, description, icon_url, created_at, updated_at
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
