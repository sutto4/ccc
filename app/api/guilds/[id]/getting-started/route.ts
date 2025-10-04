import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Checklist items configuration
const CHECKLIST_ITEMS = [
  {
    id: 'bot_setup',
    title: 'Verify Bot Setup',
    description: 'Ensure bot has proper permissions and role positioning',
    icon: 'Bot',
    checkFunction: 'checkBotPermissions'
  },
  {
    id: 'server_config',
    title: 'Configure Server',
    description: 'Review and set up basic server settings',
    icon: 'Settings',
    checkFunction: 'checkServerConfig',
    href: '/guilds/[id]/settings'
  },
  {
    id: 'role_permissions',
    title: 'Set Role Permissions',
    description: 'Configure role access for dashboard features',
    icon: 'Shield',
    checkFunction: 'checkRolePermissions'
  },
  {
    id: 'enable_features',
    title: 'Enable Server Features',
    description: 'Choose and enable features like AI, commands, etc.',
    icon: 'ToggleLeft',
    checkFunction: 'checkFeaturesEnabled'
  },
  {
    id: 'create_server_group',
    title: 'Create Server Group',
    description: 'Organize multiple servers with group management',
    icon: 'FolderPlus',
    checkFunction: 'checkServerGroup'
  },
  {
    id: 'join_support',
    title: 'Join Support Discord',
    description: 'Get help, updates, and connect with community',
    icon: 'MessageSquare',
    checkFunction: 'checkSupportJoined',
    href: 'https://discord.gg/nrSjZByddw',
    external: true
  }
];

export const GET = async (request: NextRequest) => {
  // Check authentication
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  try {
    const url = new URL(request.url);
    console.log('[GETTING-STARTED] Request URL:', request.url);
    console.log('[GETTING-STARTED] URL pathname:', url.pathname);
    
    const guildId = url.pathname.split('/')[3]; // Extract guild ID from /api/guilds/[id]/getting-started
    console.log('[GETTING-STARTED] Extracted guild ID:', guildId);
    
    if (!guildId) {
      console.error('[GETTING-STARTED] No guild ID found in URL');
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      );
    }
    
    // Get or create getting started record
    console.log('[GETTING-STARTED] Querying database for guild:', guildId, 'user:', auth.user.id);
    let gettingStartedRow = await query(
      'SELECT * FROM getting_started WHERE guild_id = ? AND user_id = ?',
      [guildId, auth.user.id]
    ) as any[];
    console.log('[GETTING-STARTED] Database query result:', gettingStartedRow);

    let completionData = {};
    let dismissed = false;
    let dismissedAt = null;

    if (gettingStartedRow.length > 0) {
      const row = gettingStartedRow[0];
      // Handle both JSON string and already parsed object
      if (typeof row.completion_data === 'string') {
        completionData = JSON.parse(row.completion_data || '{}');
      } else {
        completionData = row.completion_data || {};
      }
      dismissed = row.dismissed;
      dismissedAt = row.dismissed_at;
    } else {
      // Create new record with empty JSON object
      console.log('[GETTING-STARTED] Creating new record for guild:', guildId, 'user:', auth.user.id);
      try {
        await query(
          'INSERT INTO getting_started (guild_id, user_id, completion_data) VALUES (?, ?, ?)',
          [guildId, auth.user.id, JSON.stringify({})]
        );
        console.log('[GETTING-STARTED] Successfully created new record');
        completionData = {};
      } catch (insertError) {
        console.error('[GETTING-STARTED] Error creating new record:', insertError);
        throw insertError;
      }
    }

    // Debug: Show all features for this guild
    try {
      const allFeatures = await query(
        'SELECT feature_key, enabled FROM guild_features WHERE guild_id = ?',
        [guildId]
      );
      console.log(`[GETTING-STARTED] All features for guild ${guildId}:`, allFeatures);
    } catch (error) {
      console.error(`[GETTING-STARTED] Error fetching features for guild ${guildId}:`, error);
    }

    // Build checklist with completion status
    const items = await Promise.all(CHECKLIST_ITEMS.map(async (item) => {
      let completed = completionData[item.id]?.completed || false;
      
      // Auto-check certain items based on current state
      if (!completed) {
        completed = await checkItemCompletion(guildId, item.id, auth.user.id);
        if (completed) {
          console.log(`[GETTING-STARTED] Auto-completing item ${item.id} for guild ${guildId}`);
          // Update completion data
          completionData[item.id] = {
            completed: true,
            completed_at: new Date().toISOString()
          };
          
          // Update database
          await query(
            'UPDATE getting_started SET completion_data = ? WHERE guild_id = ? AND user_id = ?',
            [JSON.stringify(completionData), guildId, auth.user.id]
          );
        }
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        icon: item.icon,
        completed,
        completed_at: completionData[item.id]?.completed_at || null,
        href: item.href?.replace('[id]', guildId),
        external: item.external
      };
    }));

    const totalCompleted = items.filter(item => item.completed).length;
    const totalItems = items.length;

    return NextResponse.json({
      items,
      totalCompleted,
      totalItems,
      dismissed,
      dismissedAt
    });

  } catch (error) {
    console.error('[GETTING-STARTED] Error:', error);
    console.error('[GETTING-STARTED] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch getting started data', details: error instanceof Error ? error.message : String(error) },
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
    const guildId = url.pathname.split('/')[3]; // Extract guild ID from /api/guilds/[id]/getting-started
    const body = await request.json();
    const { action, itemId } = body;

    // Get current data
    let gettingStartedRow = await query(
      'SELECT * FROM getting_started WHERE guild_id = ? AND user_id = ?',
      [guildId, auth.user.id]
    ) as any[];

    if (gettingStartedRow.length === 0) {
      // Create new record with empty JSON object
      await query(
        'INSERT INTO getting_started (guild_id, user_id, completion_data) VALUES (?, ?, ?)',
        [guildId, auth.user.id, JSON.stringify({})]
      );
      gettingStartedRow = [{ completion_data: '{}', dismissed: false }];
    }

    const row = gettingStartedRow[0];
    // Handle both JSON string and already parsed object
    let completionData;
    if (typeof row.completion_data === 'string') {
      completionData = JSON.parse(row.completion_data || '{}');
    } else {
      completionData = row.completion_data || {};
    }
    let dismissed = row.dismissed;
    let dismissedAt = row.dismissed_at;

    if (action === 'complete' && itemId) {
      // Mark item as completed
      completionData[itemId] = {
        completed: true,
        completed_at: new Date().toISOString()
      };
      
      await query(
        'UPDATE getting_started SET completion_data = ? WHERE guild_id = ? AND user_id = ?',
        [JSON.stringify(completionData), guildId, auth.user.id]
      );
      
    } else if (action === 'dismiss') {
      // Dismiss the widget
      await query(
        'UPDATE getting_started SET dismissed = 1, dismissed_at = NOW() WHERE guild_id = ? AND user_id = ?',
        [guildId, auth.user.id]
      );
      
    } else if (action === 'reopen') {
      // Reopen the widget
      await query(
        'UPDATE getting_started SET dismissed = 0, dismissed_at = NULL WHERE guild_id = ? AND user_id = ?',
        [guildId, auth.user.id]
      );
    } else if (action === 'reset') {
      // Reset all completion data
      await query(
        'UPDATE getting_started SET completion_data = ? WHERE guild_id = ? AND user_id = ?',
        [JSON.stringify({}), guildId, auth.user.id]
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[GETTING-STARTED] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update getting started data' },
      { status: 500 }
    );
  }
};

// Helper function to check item completion based on current state
async function checkItemCompletion(guildId: string, itemId: string, userId: string): Promise<boolean> {
  try {
    switch (itemId) {
      case 'bot_setup':
        // Check if bot has been properly configured - look for any enabled features as a proxy
        try {
          const enabledFeatures = await query(
            'SELECT COUNT(*) as count FROM guild_features WHERE guild_id = ? AND enabled = 1',
            [guildId]
          );
          const count = (enabledFeatures as any[])[0].count;
          console.log(`[GETTING-STARTED] Bot setup check for guild ${guildId}: ${count} enabled features`);
          return count > 0;
        } catch (error) {
          console.error(`[GETTING-STARTED] Error checking bot_setup for guild ${guildId}:`, error);
          return false;
        }
        
      case 'server_config':
        // Check if user has visited settings page or if any guild configuration exists
        try {
          const settingsVisit = await query(
            'SELECT COUNT(*) as count FROM user_activity WHERE guild_id = ? AND user_id = ? AND page = "settings"',
            [guildId, userId]
          );
          if ((settingsVisit as any[])[0].count > 0) return true;
          
          // Check if mod channel is configured (indicates settings have been touched)
          const modChannel = await query(
            'SELECT mod_channel_id FROM guilds WHERE guild_id = ? AND mod_channel_id IS NOT NULL',
            [guildId]
          );
          if ((modChannel as any[]).length > 0) return true;
          
          // Also check if any features are configured (proxy for settings being touched)
          const configuredFeatures = await query(
            'SELECT COUNT(*) as count FROM guild_features WHERE guild_id = ? AND enabled = 1',
            [guildId]
          );
          return (configuredFeatures as any[])[0].count > 0;
        } catch {
          return false;
        }
        
      case 'role_permissions':
        // Check if any role permissions have been set in server_role_permissions table
        try {
          const rolePerms = await query(
            'SELECT COUNT(*) as count FROM server_role_permissions WHERE guild_id = ? AND can_use_app = 1',
            [guildId]
          );
          return (rolePerms as any[])[0].count > 0;
        } catch {
          return false;
        }
        
      case 'enable_features':
        // Check if any features are enabled in guild_features table
        try {
          const features = await query(
            'SELECT COUNT(*) as count FROM guild_features WHERE guild_id = ? AND enabled = 1',
            [guildId]
          );
          const count = (features as any[])[0].count;
          console.log(`[GETTING-STARTED] Enable features check for guild ${guildId}: ${count} enabled features`);
          return count > 0;
        } catch (error) {
          console.error(`[GETTING-STARTED] Error checking enable_features for guild ${guildId}:`, error);
          return false;
        }
        
      case 'create_server_group':
        // Check if user has created any server groups
        try {
          const serverGroups = await query(
            'SELECT COUNT(*) as count FROM server_groups WHERE owner_user_id = ?',
            [userId]
          );
          return (serverGroups as any[])[0].count > 0;
        } catch {
          return false;
        }
        
      case 'join_support':
        // This would need to be manually marked as completed when user clicks Discord link
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking completion for ${itemId}:`, error);
    return false;
  }
}