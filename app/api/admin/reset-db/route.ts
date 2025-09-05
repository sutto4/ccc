import { NextResponse } from "next/server";
import { resetPool, getPoolStatus } from "@/lib/db";

export async function POST() {
  try {
    console.log('Resetting database pool...');
    await resetPool();
    
    const status = getPoolStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Database pool reset successfully',
      poolStatus: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Failed to reset database pool:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Add a manual premium cleanup endpoint
export async function PUT(request: Request) {
  try {
    const { guildId } = await request.json();
    
    if (!guildId) {
      return NextResponse.json({
        success: false,
        error: 'guildId is required'
      }, { status: 400 });
    }
    
    console.log(`Manual premium cleanup requested for guild ${guildId}...`);
    
    // Dynamically import MySQL driver
    const { default: mysqlDriver } = await import('mysql2/promise');
    
    // Connect to MySQL database
    const connection = await mysqlDriver.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'admin_user',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'chester_bot',
      port: 3306
    });
    
    try {
      // Begin transaction
      await connection.beginTransaction();
      
      // 1. Update guilds table - remove all premium-related fields
      console.log(`Updating guilds table for ${guildId}...`);
      await connection.execute(`
        UPDATE guilds 
        SET 
          premium = '0',
          stripe_customer_id = NULL,
          customer_email = NULL,
          customer_name = NULL,
          subscription_id = NULL,
          subscription_status = NULL,
          current_period_start = NULL,
          current_period_end = NULL,
          cancel_at_period_end = '0',
          premium_expires_at = NULL
        WHERE guild_id = ?
      `, [guildId]);
      
      // 2. Disable all premium features in guild_features table
      console.log(`Disabling premium features for ${guildId}...`);
      const [premiumFeatures] = await connection.execute(`
        SELECT feature_key as feature_key, feature_name as feature_name 
        FROM features 
        WHERE minimum_package = 'premium' AND is_active = 1
      `);
      
      if (Array.isArray(premiumFeatures) && premiumFeatures.length > 0) {
        for (const feature of premiumFeatures) {
          const featureName = feature.feature_key || feature.feature_name;
          console.log(`Disabling feature: ${featureName} for guild ${guildId}`);
          
          await connection.execute(`
            INSERT INTO guild_features (guild_id, feature_name, enabled) 
            VALUES (?, ?, 0) 
            ON DUPLICATE KEY UPDATE enabled = 0, updated_at = CURRENT_TIMESTAMP
          `, [guildId, featureName]);
        }
      }
      
      // 3. Remove any active subscription allocations
      console.log(`Removing subscription allocations for ${guildId}...`);
      await connection.execute(`
        UPDATE subscription_allocations 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ? AND is_active = TRUE
      `, [guildId]);
      
      await connection.commit();
      console.log(`Successfully cleaned up premium access for guild ${guildId}`);
      
      return NextResponse.json({
        success: true,
        message: `Premium access cleaned up for guild ${guildId}`,
        timestamp: new Date().toISOString()
      });
      
    } catch (dbError) {
      await connection.rollback();
      console.error('Database error during premium cleanup:', dbError);
      throw dbError;
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    console.error('Failed to cleanup premium access:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
