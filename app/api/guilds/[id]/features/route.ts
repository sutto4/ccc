import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { CommandRegistry } from "@/services/commandRegistry";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: guildId } = await params;
  
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
      // Check if guild exists (no status check - guild is confirmed active)
      const [guildRows] = await connection.execute(
        `SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      // Get all features from the features table
      const [featuresRows] = await connection.execute(
        `SELECT feature_key, feature_name, description, minimum_package, is_active FROM features WHERE is_active = 1 ORDER BY feature_key`
      );

      // Get guild-specific feature settings
      let guildFeaturesRows: any[] = [];
      try {
        const [guildFeaturesResult] = await connection.execute(
          `SELECT feature_key, enabled FROM guild_features WHERE guild_id = ?`,
          [guildId]
        );
        guildFeaturesRows = guildFeaturesResult;
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
  const { id: guildId } = await params;
  
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

      // Insert or update the feature setting
      await connection.execute(
        `INSERT INTO guild_features (guild_id, feature_key, enabled) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP`,
        [guildId, feature_name, enabled ? 1 : 0]
      );

      // Get all current features for this guild to update commands
      const [currentFeaturesResult] = await connection.execute(
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
          const fs = require('fs');
          const path = require('path');
          const commandFile = path.join(process.cwd(), 'command-updates.json');
          
          const commandUpdate = {
            timestamp: new Date().toISOString(),
            guildId,
            action: enabled ? 'enabled' : 'disabled',
            features: currentFeatures
          };
          
          // Read existing updates or create new array
          let updates = [];
          if (fs.existsSync(commandFile)) {
            updates = JSON.parse(fs.readFileSync(commandFile, 'utf8'));
          }
          
          // Add new update
          updates.push(commandUpdate);
          
          // Keep only last 10 updates
          if (updates.length > 10) {
            updates = updates.slice(-10);
          }
          
          // Write back to file
          fs.writeFileSync(commandFile, JSON.stringify(updates, null, 2));
        } catch (fileError) {
          console.error('[FEATURES-PUT] Failed to write command update to file:', fileError);
        }
        
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
