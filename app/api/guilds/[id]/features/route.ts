import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    try {
      // Check if guild exists and is active
      const [guildRows] = await connection.execute(
        `SELECT guild_id, status FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      const guild = guildRows[0];
      if (guild.status === 'left') {
        return NextResponse.json({ error: "Guild has left the bot" }, { status: 410 });
      }

      // Get all features from the features table
      const [featuresRows] = await connection.execute(
        `SELECT feature_key, feature_name, description, minimum_package, is_active FROM features WHERE is_active = 1 ORDER BY feature_name`
      );

      // Get guild-specific feature settings
      let guildFeaturesRows: any[] = [];
      try {
        const [guildFeaturesResult] = await connection.execute(
          `SELECT feature_name, enabled FROM guild_features WHERE guild_id = ?`,
          [guildId]
        );
        guildFeaturesRows = guildFeaturesResult;
      } catch (error) {
        console.log('[FEATURES-GET] guild_features table might not exist, using empty features');
        guildFeaturesRows = [];
      }

      // Create a map of guild feature settings
      const guildFeaturesMap: Record<string, boolean> = {};
      guildFeaturesRows.forEach((row: any) => {
        guildFeaturesMap[row.feature_name] = Boolean(row.enabled);
      });

      // Build the features response
      const features: Record<string, any> = {};
      featuresRows.forEach((row: any) => {
        const featureKey = row.feature_key;
        const isEnabled = guildFeaturesMap.hasOwnProperty(featureKey) ? guildFeaturesMap[featureKey] : false;
        
        features[featureKey] = isEnabled;
        features[`${featureKey}_package`] = row.minimum_package;
      });

      console.log('[FEATURES-GET] Features response:', features);
      
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

      // Check if guild exists and is active
      const [guildRows] = await connection.execute(
        `SELECT guild_id, status FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      const guild = guildRows[0];
      if (guild.status === 'left') {
        return NextResponse.json({ error: "Guild has left the bot" }, { status: 410 });
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
      
      return NextResponse.json({ 
         success: true, 
         message: `Feature ${feature_name} ${enabled ? 'enabled' : 'disabled'} for guild ${guildId}` 
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
