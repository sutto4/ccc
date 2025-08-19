import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: guildId } = await params;
  
  try {
    const body = await req.json();
    const { features } = body;
    
    if (!features || typeof features !== 'object') {
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

      // Check if guild_features table exists, create if it doesn't
      const [tableCheck] = await connection.execute(
        `SHOW TABLES LIKE 'guild_features'`
      );
      
      if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
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
      }

      // Process each feature update
      const updates = [];
      for (const [featureName, enabled] of Object.entries(features)) {
        // Skip package keys and non-boolean values
        if (featureName.endsWith('_package') || typeof enabled !== 'boolean') {
          continue;
        }

        // Check if feature exists
        const [featureRows] = await connection.execute(
          `SELECT feature_name FROM features WHERE feature_name = ? AND is_active = 1 LIMIT 1`,
          [featureName]
        );

        if (Array.isArray(featureRows) && featureRows.length > 0) {
          // Update or insert the feature setting
          await connection.execute(
            `INSERT INTO guild_features (guild_id, feature_name, enabled) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE enabled = ?`,
            [guildId, featureName, enabled, enabled]
          );
          
          updates.push({ feature: featureName, enabled });
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Updated ${updates.length} features successfully`,
        updates: updates
      });
      
    } finally {
      await connection.end();
    }
  } catch (e: any) {
    console.error('Error bulk updating features:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
