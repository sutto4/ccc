import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  console.log('Features API called with params:', params);
  const { id: guildId } = await params;
  console.log('Guild ID extracted:', guildId);
  try {
    // Require DB configuration
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Dynamically import the MySQL driver
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
      // First check if guild exists and has premium status
      const [guildRows] = await connection.execute(
        `SELECT premium FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      const guild = (guildRows as any[])[0] as any;
      const globalPremium = !!guild?.premium;

      // Try to fetch features with guild_features join, fallback to features table only if it fails
      let featureRows: any[] = [];
      try {
        // First, check if guild_features table exists
        const [tableCheck] = await connection.execute(
          `SHOW TABLES LIKE 'guild_features'`
        );
        
        if (Array.isArray(tableCheck) && tableCheck.length > 0) {
          // guild_features table exists, try the join
          const [rows] = await connection.execute(
            `SELECT f.feature_name, f.minimum_package, gf.enabled 
             FROM features f 
             LEFT JOIN guild_features gf ON f.feature_name = gf.feature_name AND gf.guild_id = ?
             WHERE f.is_active = 1`,
            [guildId]
          );
          featureRows = rows as any[];
          console.log('Successfully fetched features with guild_features join');
        } else {
          // guild_features table doesn't exist, fallback to features table only
          const [rows] = await connection.execute(
            `SELECT feature_name, minimum_package FROM features WHERE is_active = 1`,
            []
          );
          featureRows = rows as any[];
          console.log('guild_features table not found, using features table only');
        }
      } catch (error) {
        console.log('Error with guild_features join, falling back to features table only:', error);
        // Fallback: just get features from the global features table
        const [rows] = await connection.execute(
          `SELECT feature_name, minimum_package FROM features WHERE is_active = 1`,
          []
        );
        featureRows = rows as any[];
        console.log('Fallback: fetched features from features table only');
      }

      console.log('Raw feature rows from database:', featureRows);
      console.log('Guild ID being queried:', guildId);

      // Build features object with both status and package requirements
      const features: Record<string, any> = {};
      
      if (Array.isArray(featureRows)) {
        (featureRows as any[]).forEach((row: any) => {
          const featureName = row.feature_name;
          const packageType = row.minimum_package;
          const isEnabled = row.enabled === "1" || row.enabled === 1 || row.enabled === true;
          
          console.log(`Processing feature: ${featureName}, package: ${packageType}, enabled: ${isEnabled}`);
          
          // Set feature as enabled based on guild_features.enabled, or true if no guild_features table
          features[featureName] = row.hasOwnProperty('enabled') ? isEnabled : true;
          
          // Add package requirement
          const packageKey = `${featureName}_package`;
          features[packageKey] = packageType;
        });
      }

      console.log('Built features object:', features);

      // If global premium is enabled, enable access to all features
      // BUT don't change the package requirements - those come from the database
      if (globalPremium) {
        // List of all available features
        const allFeatures = [
          'verification_system', 'feedback_system', 'moderation',
          'fdg_donator_sync', 'custom_prefix', 'fivem_esx', 'fivem_qbcore',
          'reaction_roles', 'custom_commands', 'creator_alerts', 'bot_customisation',
          'embedded_messages', 'custom_groups', 'premium_members'
        ];

        allFeatures.forEach(feature => {
          // Enable access to the feature
          features[feature] = true;
          
          // Only set package requirement if it wasn't already set from the database
          // This preserves the actual free/premium status from the features table
          if (!features[`${feature}_package`]) {
            features[`${feature}_package`] = 'premium';
          }
        });
      }

      console.log('Final API response:', { guildId, features, globalPremium });
      return NextResponse.json({ guildId, features });
    } finally {
      await connection.end();
    }
  } catch (e: any) {
    console.error('Error fetching features:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: guildId } = await params;
  
  try {
    const body = await req.json();
    const { feature_name, enabled } = body;
    
    if (!feature_name || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Require DB configuration
    if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Dynamically import the MySQL driver
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
      // Check if guild exists
      const [guildRows] = await connection.execute(
        `SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1`,
        [guildId]
      );

      if (!Array.isArray(guildRows) || guildRows.length === 0) {
        return NextResponse.json({ error: "Guild not found" }, { status: 404 });
      }

      // Check if feature exists
      const [featureRows] = await connection.execute(
        `SELECT feature_name FROM features WHERE feature_name = ? AND is_active = 1 LIMIT 1`,
        [feature_name]
      );

      if (!Array.isArray(featureRows) || featureRows.length === 0) {
        return NextResponse.json({ error: "Feature not found" }, { status: 404 });
      }

      // Check if guild_features table exists
      const [tableCheck] = await connection.execute(
        `SHOW TABLES LIKE 'guild_features'`
      );
      
      if (Array.isArray(tableCheck) && tableCheck.length > 0) {
        // guild_features table exists, update or insert
        await connection.execute(
          `INSERT INTO guild_features (guild_id, feature_name, enabled) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE enabled = ?`,
          [guildId, feature_name, enabled, enabled]
        );
      } else {
        // guild_features table doesn't exist, create it and insert
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS guild_features (
            guild_id VARCHAR(255) NOT NULL,
            feature_name VARCHAR(100) NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            settings JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (guild_id, feature_name),
            FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
            FOREIGN KEY (feature_name) REFERENCES features(feature_name) ON DELETE CASCADE
          )
        `);
        
        await connection.execute(
          `INSERT INTO guild_features (guild_id, feature_name, enabled) VALUES (?, ?, ?)`,
          [guildId, feature_name, enabled]
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: `Feature ${feature_name} ${enabled ? 'enabled' : 'disabled'} successfully` 
      });
      
    } finally {
      await connection.end();
    }
  } catch (e: any) {
    console.error('Error updating feature:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
