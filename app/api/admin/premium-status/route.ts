import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guildId');
    
    if (!guildId) {
      return NextResponse.json({
        success: false,
        error: 'guildId query parameter is required'
      }, { status: 400 });
    }
    
    console.log(`Checking premium status for guild ${guildId}...`);
    
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
      // Check guild premium status
      const [guildStatus] = await connection.execute(`
        SELECT 
          guild_id,
          premium,
          subscription_id,
          stripe_customer_id,
          customer_email,
          subscription_status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          premium_expires_at
        FROM guilds 
        WHERE guild_id = ?
      `, [guildId]);
      
      // Check guild features status
      const [featuresStatus] = await connection.execute(`
        SELECT 
          feature_name,
          enabled,
          updated_at
        FROM guild_features 
        WHERE guild_id = ?
        ORDER BY feature_name
      `, [guildId]);
      
      // Check subscription allocations
      const [allocations] = await connection.execute(`
        SELECT 
          subscription_id,
          is_active,
          allocated_at,
          updated_at
        FROM subscription_allocations 
        WHERE guild_id = ?
        ORDER BY allocated_at DESC
      `, [guildId]);
      
      // Check if guild exists
      if (!guildStatus || guildStatus.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Guild not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        guildId: guildId,
        guildStatus: guildStatus[0],
        featuresCount: featuresStatus.length,
        features: featuresStatus,
        allocationsCount: allocations.length,
        allocations: allocations,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      await connection.end();
    }
    
  } catch (error) {
    console.error('Failed to check premium status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
