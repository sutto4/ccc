import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get default features from default_features table (or all features if none set)
    let features;
    try {
      features = await query(`
        SELECT feature_key 
        FROM default_features 
        WHERE enabled_by_default = 1
      `);
    } catch (error) {
      // If default_features table doesn't exist, fall back to all free features
      features = await query(
        'SELECT feature_key FROM features WHERE minimum_package = "free" AND is_active = 1'
      );
    }
    
    // Get default commands from the default_commands table
    const commands = await query(`
      SELECT command_name 
      FROM default_commands 
      WHERE enabled_by_default = 1
    `);
    
    return NextResponse.json({
      success: true,
      defaults: {
        features: features.map((f: any) => f.feature_key),
        commands: commands.map((c: any) => c.command_name)
      }
    });
  } catch (error) {
    console.error('Error fetching default config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch default configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { features, commands } = await request.json();
    
    // Update default features without modifying the features table
    if (features && Array.isArray(features)) {
      // Create default_features table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS default_features (
          id INT AUTO_INCREMENT PRIMARY KEY,
          feature_key VARCHAR(50) NOT NULL UNIQUE,
          enabled_by_default BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (feature_key) REFERENCES features(feature_key) ON DELETE CASCADE
        )
      `);
      
      // Populate default_features table with all features if empty
      await query(`
        INSERT IGNORE INTO default_features (feature_key, enabled_by_default)
        SELECT feature_key, FALSE FROM features
      `);
      
      // First, disable all features by default
      await query('UPDATE default_features SET enabled_by_default = 0');
      
      // Then enable selected features
      if (features.length > 0) {
        const placeholders = features.map(() => '?').join(',');
        await query(
          `UPDATE default_features SET enabled_by_default = 1 WHERE feature_key IN (${placeholders})`,
          features
        );
      }
    }
    
    // Handle fine-grained command control
    if (commands && Array.isArray(commands)) {
      // First, disable all commands by default
      await query('UPDATE default_commands SET enabled_by_default = 0');
      
      // Then enable selected commands
      if (commands.length > 0) {
        const placeholders = commands.map(() => '?').join(',');
        await query(
          `UPDATE default_commands SET enabled_by_default = 1 WHERE command_name IN (${placeholders})`,
          commands
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Default configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating default config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update default configuration' },
      { status: 500 }
    );
  }
}
