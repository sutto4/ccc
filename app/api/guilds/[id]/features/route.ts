import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { CommandRegistry } from "@/services/commandRegistry";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  console.log('🚨🚨🚨 FEATURES GET FUNCTION IS RUNNING! 🚨🚨🚨');
  console.log('[FEATURES-GET] GET request received');
  const { id: guildId } = await params;
  console.log('[FEATURES-GET] Guild ID:', guildId);
  
  try {
    // Require DB configuration
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    let mysql: any;
    try {
      ({ default: mysql } = await import("mysql2/promise"));
    } catch {
      return NextResponse.json({ error: "Database driver not installed. Run: pnpm add mysql2" }, { status: 500 });
    }

    const connection = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    });
    
    // Check which database we're actually connected to
    const [dbResult] = await connection.execute(`SELECT DATABASE() as current_db`);
    console.log('[FEATURES-GET] Connected to database:', dbResult);

    try {
      // Check if guild exists (no status check - guild is confirmed active)
      const [guildRows] = await connection.execute(
        `SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      // Debug: Log the guild status to see what's in the database
      const [statusRows] = await connection.execute(
        `SELECT guild_id, status, premium, subscription_id, product_name FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );
      
      if (statusRows.length > 0) {
        console.log('[FEATURES-GET] Guild status from Next.js DB:', statusRows[0]);
      }

      // Get all features from the features table - we need the actual feature keys, not display names
      const [featuresRows] = await connection.execute(
        `SELECT feature_name, description, minimum_package, is_active FROM features WHERE is_active = 1 ORDER BY feature_name`
      );
      console.log('[FEATURES-GET] Raw features result:', featuresRows);
      console.log('[FEATURES-GET] Features table structure:', featuresRows.length > 0 ? Object.keys(featuresRows[0]) : 'No features');
      
      // We need to create a mapping from display names to feature keys
      // Since the features table seems to have display names, let's check if there's a separate mapping table
      // For now, let's create a manual mapping based on what we see in the data
      const displayNameToKeyMap: Record<string, string> = {
        'Ban Syncing': 'ban_sync',
        'Bot Customisation': 'bot_customisation',
        'Creator Alerts': 'creator_alerts',
        'Custom Commands': 'custom_commands',
        'Custom Dot Command Prefix': 'custom_prefix',
        'Custom Groups': 'custom_groups',
        'Embedded Messages': 'embedded_messages',
        'FDG Donator Sync': 'fdg_donator_sync',
        'Feedback Collection': 'feedback_system',
        'FiveM ESX Integration': 'fivem_esx',
        'FiveM QBcore Integration': 'fivem_qbcore',
        'Moderation Tools': 'moderation',
        'Reaction Roles': 'reaction_roles',
        'User Verification System': 'verification_system'
      };

      // Get guild-specific feature settings
      let guildFeaturesRows: any[] = [];
      try {
        console.log('[FEATURES-GET] Querying guild_features for guild_id:', guildId);
        
        // First, let's check if the guild_features table exists and has data
        const [tableCheck] = await connection.execute(`SHOW TABLES LIKE 'guild_features'`);
        console.log('[FEATURES-GET] guild_features table exists:', tableCheck.length > 0);
        
        if (tableCheck.length > 0) {
          // Check total count of guild_features
          const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM guild_features`);
          console.log('[FEATURES-GET] Total guild_features records:', countResult);
          
          // Check if this specific guild has any features
          const [guildCountResult] = await connection.execute(
            `SELECT COUNT(*) as count FROM guild_features WHERE guild_id = ?`,
            [guildId]
          );
          console.log('[FEATURES-GET] Features count for this guild:', guildCountResult);
        }
        
        const [guildFeaturesResult] = await connection.execute(
          `SELECT feature_name, enabled FROM guild_features WHERE guild_id = ?`,
          [guildId]
        );
        guildFeaturesRows = guildFeaturesResult;
        console.log('[FEATURES-GET] Raw guild features result:', guildFeaturesResult);
        console.log('[FEATURES-GET] Raw guild features result length:', guildFeaturesResult.length);
        
        // Let's also see the exact SQL being executed
        console.log('[FEATURES-GET] SQL Query:', `SELECT feature_name, enabled FROM guild_features WHERE guild_id = '${guildId}'`);
        
        // Let's also check if there are any features for this guild with a different query
        const [allGuildFeatures] = await connection.execute(`SELECT * FROM guild_features WHERE guild_id = ? LIMIT 5`, [guildId]);
        console.log('[FEATURES-GET] All guild features for this guild (first 5):', allGuildFeatures);
      } catch (error) {
        console.log('[FEATURES-GET] guild_features table might not exist, using empty features');
        console.log('[FEATURES-GET] Error details:', error);
        guildFeaturesRows = [];
      }

      // Create a map of guild feature settings
      const guildFeaturesMap: Record<string, boolean> = {};
      guildFeaturesRows.forEach((row: any) => {
        console.log('[FEATURES-GET] Processing guild feature row:', row);
        guildFeaturesMap[row.feature_name] = Boolean(row.enabled);
      });

      console.log('[FEATURES-GET] Guild features map:', guildFeaturesMap);

      // Build the features response
      const features: Record<string, any> = {};
      featuresRows.forEach((row: any) => {
        const displayName = row.feature_name;
        const actualFeatureKey = displayNameToKeyMap[displayName];
        const isEnabled = actualFeatureKey && guildFeaturesMap.hasOwnProperty(actualFeatureKey) ? guildFeaturesMap[actualFeatureKey] : false;
        
        console.log(`[FEATURES-GET] Building feature ${displayName}:`, {
          displayName,
          actualFeatureKey,
          hasProperty: actualFeatureKey && guildFeaturesMap.hasOwnProperty(actualFeatureKey),
          rawValue: actualFeatureKey ? guildFeaturesMap[actualFeatureKey] : undefined,
          isEnabled,
          guildFeaturesMap
        });
        
        features[displayName] = isEnabled;
        features[`${displayName}_package`] = row.minimum_package;
      });

      console.log('[FEATURES-GET] Features response:', features);
      console.log('[FEATURES-GET] Features response keys:', Object.keys(features));
      
      return NextResponse.json({ 
        guildId,
        features 
      });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('[FEATURES-GET] Error fetching features:', error);
    return NextResponse.json({ 
      error: "Failed to fetch features",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  console.log('[FEATURES-PUT] PUT request received');
  const { id: guildId } = await params;
  console.log('[FEATURES-PUT] Guild ID:', guildId);
  
  try {
    // Require DB configuration
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    let mysql: any;
    try {
      ({ default: mysql } = await import("mysql2/promise"));
    } catch {
      return NextResponse.json({ error: "Database driver not installed. Run: pnpm add mysql2" }, { status: 500 });
    }

    const connection = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    });

    try {
      // Parse request body
      const body = await req.json();
      const { feature_name, enabled } = body;
      
      console.log('[FEATURES-PUT] Request body:', { feature_name, enabled, guildId });
      
      if (!feature_name || typeof enabled !== 'boolean') {
        return NextResponse.json({ error: "Invalid request body. Requires feature_name and enabled fields." }, { status: 400 });
      }

      // Check if guild exists (no status check)
      const [guildRows] = await connection.execute(
        `SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      // Check if guild_features table exists, create it if it doesn't
      try {
        await connection.execute(
          `CREATE TABLE IF NOT EXISTS guild_features (
            id int(11) NOT NULL AUTO_INCREMENT,
            guild_id varchar(255) NOT NULL,
            feature_name varchar(255) NOT NULL,
            enabled tinyint(1) NOT NULL DEFAULT 0,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY guild_feature (guild_id, feature_name),
            KEY guild_id (guild_id),
            KEY feature_name (feature_name)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        );
        console.log('[FEATURES-PUT] Created guild_features table');
      } catch (error) {
        console.log('[FEATURES-PUT] guild_features table already exists or creation failed:', error);
      }

            // Insert or update the feature setting
      await connection.execute(
        `INSERT INTO guild_features (guild_id, feature_name, enabled) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP`,
        [guildId, feature_name, enabled ? 1 : 0]
      );

      console.log('[FEATURES-PUT] Feature updated successfully');

      // Get all current features for this guild to update commands
      const [currentFeaturesResult] = await connection.execute(
        `SELECT feature_name FROM guild_features WHERE guild_id = ? AND enabled = 1`,
        [guildId]
      );
      
      const currentFeatures = currentFeaturesResult.map((row: any) => row.feature_name);
      console.log('[FEATURES-PUT] Current enabled features for guild:', currentFeatures);

      // Update Discord commands for this guild via bot command server
      try {
        const botResponse = await fetch('http://localhost:3001/commands', {
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

        if (botResponse.ok) {
          const result = await botResponse.json();
          console.log('[FEATURES-PUT] Bot command update successful:', result);
        } else {
          console.error('[FEATURES-PUT] Bot command update failed:', await botResponse.text());
        }
      } catch (commandError) {
        console.error('[FEATURES-PUT] Error updating bot commands:', commandError);
        // Don't fail the feature update if command update fails
      }
      
      return NextResponse.json({ 
         success: true, 
         message: `Feature ${feature_name} ${enabled ? 'enabled' : 'disabled'} for guild ${guildId}`,
         commandsUpdated: true,
         currentFeatures: currentFeatures
       });

    } finally {
      await connection.end();
    }

  } catch (error) {
    console.error('[FEATURES-PUT] Error updating feature:', error);
    return NextResponse.json({ 
      error: "Failed to update feature",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
