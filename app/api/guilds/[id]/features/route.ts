import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { CommandRegistry } from "@/services/commandRegistry";
import { query } from '@/lib/db';
import { SystemLogger } from '@/lib/system-logger';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: guildId } = await params;
  
  try {
    // Check if guild exists (no status check - guild is confirmed active)
    const guildRows = await query(
      `SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1`,
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Get all features from the features table
    const featuresRows = await query(
      `SELECT feature_key, feature_name, description, minimum_package, is_active FROM features WHERE is_active = 1 ORDER BY feature_key`
    );

    // Get guild-specific feature settings
    let guildFeaturesRows: any[] = [];
    try {
      guildFeaturesRows = await query(
        `SELECT feature_key, enabled FROM guild_features WHERE guild_id = ?`,
        [guildId]
      );
    } catch (error) {
      guildFeaturesRows = [];
    }

      // Create a map of guild feature settings using feature keys
      const guildFeaturesMap: Record<string, boolean> = {};
      guildFeaturesRows.forEach((row: any) => {
        guildFeaturesMap[row.feature_key] = Boolean(row.enabled);
      });

      // Build the features response
      const features: Record<string, any> = {};
      featuresRows.forEach((row: any) => {
        const featureKey = row.feature_key;
        const isEnabled = guildFeaturesMap.hasOwnProperty(featureKey) ? guildFeaturesMap[featureKey] : false;

        features[featureKey] = isEnabled;
        features[`${featureKey}_package`] = row.minimum_package;
      });
      
    return NextResponse.json({ 
      guildId,
      features 
    });

  } catch (error) {
    console.error('[FEATURES-GET] Error fetching features:', error);
    return NextResponse.json({ 
      error: "Failed to fetch features",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const PUT = async (
  req: Request, 
  { params }: { params: { id: string } }
) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = params;
  
  try {
    // Require DB configuration
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Parse request body
    const body = await req.json();
    const { feature_name, enabled } = body;
    
    if (!feature_name || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: "Invalid request body. Requires feature_name and enabled fields." }, { status: 400 });
    }

    // Check if guild exists (no status check)
    const guildRows = await query(
      `SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1`,
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    // Check if guild_features table exists, create it if it doesn't
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS guild_features (
          id int(11) NOT NULL AUTO_INCREMENT,
          guild_id varchar(255) NOT NULL,
          feature_key varchar(255) NOT NULL,
          enabled tinyint(1) NOT NULL DEFAULT 0,
          created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY guild_feature (guild_id, feature_key),
          KEY guild_id (guild_id),
          KEY feature_key (feature_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      );
    } catch (error) {
      // Table already exists or creation failed
    }

    // Get old feature state for logging
    const oldFeatureResult = await query(
      `SELECT enabled FROM guild_features WHERE guild_id = ? AND feature_key = ? LIMIT 1`,
      [guildId, feature_name]
    );
    const oldEnabled = oldFeatureResult.length > 0 ? Boolean(oldFeatureResult[0].enabled) : false;

    // Insert or update the feature setting
    await query(
      `INSERT INTO guild_features (guild_id, feature_key, enabled) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP`,
      [guildId, feature_name, enabled ? 1 : 0]
    );

    // Log the feature toggle action (include source = admin|guild)
    const source = (req.headers.get('referer') || '').includes('/admin/') ? 'admin' : 'guild';
    await SystemLogger.log({
      guildId,
      userId: auth.user.id || 'unknown',
      userName: String(auth.user.name || auth.user.username || 'Unknown User'),
      userEmail: auth.user.email || undefined,
      userRole: auth.user.role || 'viewer',
      actionType: 'feature_toggle',
      actionName: enabled ? 'enable_feature' : 'disable_feature',
      targetType: 'feature',
      targetId: feature_name,
      targetName: feature_name,
      oldValue: { enabled: oldEnabled },
      newValue: { enabled: enabled },
      metadata: {
        userAgent: req.headers.get('user-agent')?.substring(0, 500),
        ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        source
      },
      status: 'success'
    });

    // Get all current features for this guild to update commands
    const currentFeaturesResult = await query(
      `SELECT feature_key FROM guild_features WHERE guild_id = ? AND enabled = 1`,
      [guildId]
    );
    
    const currentFeatures = currentFeaturesResult.map((row: any) => row.feature_key);

    // Update Discord commands for this guild via bot command server
    try {
      const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';

      const botResponse = await fetch(`${botUrl}/api/commands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guildId,
          action: enabled ? 'enabled' : 'disabled',
          features: currentFeatures
        })
      });

      if (!botResponse.ok) {
        console.error('[FEATURES-PUT] Bot command update failed:', await botResponse.text());
      }
    } catch (commandError) {
      console.error('[FEATURES-PUT] Error updating bot commands:', commandError);
      
      // Fallback: Write to file for bot to read
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const commandFile = path.join(process.cwd(), 'command-updates.json');
        
        const commandUpdate = {
          timestamp: new Date().toISOString(),
          guildId,
          action: enabled ? 'enabled' : 'disabled',
          features: currentFeatures
        };
        
        // Read existing updates or create new array
        let updates = [];
        try {
          const data = await fs.readFile(commandFile, 'utf8');
          updates = JSON.parse(data);
        } catch {
          // File doesn't exist or is invalid, start with empty array
        }
        
        // Add new update
        updates.push(commandUpdate);
        
        // Keep only last 10 updates
        if (updates.length > 10) {
          updates = updates.slice(-10);
        }
        
        // Write back to file
        await fs.writeFile(commandFile, JSON.stringify(updates, null, 2));
      } catch (fileError) {
        console.error('[FEATURES-PUT] Failed to write command update to file:', fileError);
      }
      
      // Don't fail the feature update if command update fails
    }
    
    return NextResponse.json({ 
       success: true, 
       message: "Feature updated successfully"
     });

  } catch (error) {
    console.error('[FEATURES-PUT] Error updating feature:', error);
    
    // Log failed action - temporarily disabled
    // try {
    //   await SystemLogger.log({
    //     guildId,
    //     userId: auth.user.id || 'unknown',
    //     userName: (auth.user.name || auth.user.username || 'Unknown User') as string,
    //     userEmail: auth.user.email,
    //     userRole: auth.user.role || 'viewer',
    //     actionType: 'feature_toggle',
    //     actionName: 'update_feature_failed',
    //     targetType: 'feature',
    //     targetId: 'unknown',
    //     targetName: 'unknown',
    //     status: 'failed',
    //     errorMessage: error instanceof Error ? error.message : 'Unknown error',
    //     metadata: {
    //       userAgent: req.headers.get('user-agent')?.substring(0, 500),
    //       ip: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    //     }
    //   });
    // } catch (logError) {
    //   console.error('[FEATURES-PUT] Failed to log error:', logError);
    // }
    
    return NextResponse.json({ 
      error: "Failed to update feature",
      details: "Unknown error"
    }, { status: 500 });
  }
};
