import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

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
      // First, let's check the current status
      console.log(`Checking current premium status for guild ${guildId}...`);
      const [currentStatus] = await connection.execute(`
        SELECT premium, subscription_id, stripe_customer_id 
        FROM guilds 
        WHERE guild_id = ?
      `, [guildId]);
      
      console.log('Current guild status:', currentStatus);
      
      // Check if guild_features table exists and has data
      const [featureStatus] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM guild_features 
        WHERE guild_id = ? AND enabled = 1
      `, [guildId]);
      
      console.log('Current feature status:', featureStatus);
      
      // Begin transaction
      await connection.beginTransaction();
      
      // 1. Update guilds table - remove all premium-related fields
      console.log(`Updating guilds table for ${guildId}...`);
      const guildUpdateResult = await connection.execute(`
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
      
      console.log('Guild update result:', guildUpdateResult);
      
      // 2. Disable all premium features in guild_features table
      console.log(`Disabling premium features for ${guildId}...`);
      const [premiumFeatures] = await connection.execute(`
        SELECT feature_key, feature_name 
        FROM features 
        WHERE minimum_package = 'premium' AND is_active = 1
      `);
      
      console.log(`Found ${premiumFeatures.length} premium features to disable:`, premiumFeatures);
      
      if (Array.isArray(premiumFeatures) && premiumFeatures.length > 0) {
        for (const feature of premiumFeatures) {
          const featureName = feature.feature_key || feature.feature_name;
          console.log(`Disabling feature: ${featureName} for guild ${guildId}`);
          
          const featureUpdateResult = await connection.execute(`
            INSERT INTO guild_features (guild_id, feature_name, enabled) 
            VALUES (?, ?, 0) 
            ON DUPLICATE KEY UPDATE enabled = 0, updated_at = CURRENT_TIMESTAMP
          `, [guildId, featureName]);
          
          console.log(`Feature ${featureName} update result:`, featureUpdateResult);
        }
      }
      
      // 3. Remove any active subscription allocations
      console.log(`Removing subscription allocations for ${guildId}...`);
      const allocationUpdateResult = await connection.execute(`
        UPDATE subscription_allocations 
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE guild_id = ? AND is_active = TRUE
      `, [guildId]);
      
      console.log('Allocation update result:', allocationUpdateResult);
      
      await connection.commit();
      console.log(`Successfully cleaned up premium access for guild ${guildId}`);
      
      // Verify the cleanup
      const [verifyStatus] = await connection.execute(`
        SELECT premium, subscription_id, stripe_customer_id 
        FROM guilds 
        WHERE guild_id = ?
      `, [guildId]);
      
      console.log('Verification - guild status after cleanup:', verifyStatus);
      
      return NextResponse.json({
        success: true,
        message: `Premium access cleaned up for guild ${guildId}`,
        before: currentStatus,
        after: verifyStatus,
        featuresDisabled: premiumFeatures.length,
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
