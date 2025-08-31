import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userResult = await query(
      "SELECT role FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (!Array.isArray(userResult) || userResult.length === 0 || userResult[0]?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // First, let's see what columns actually exist in the features table
    const tableInfo = await query(`DESCRIBE features`);
    console.log('Features table structure:', tableInfo);

    // Let's also see a sample of the actual data
    const sampleData = await query(`SELECT * FROM features LIMIT 3`);
    console.log('Sample features data:', sampleData);

    // Fetch all features from the features table with guild enablement statistics
    const features = await query(`
      SELECT 
        f.feature_name as feature_key,
        f.feature_name as feature_name,
        f.description,
        f.minimum_package,
        f.is_active,
        COUNT(gf.guild_id) as total_guilds,
        SUM(CASE WHEN gf.enabled = 1 THEN 1 ELSE 0 END) as enabled_guilds,
        SUM(CASE WHEN gf.enabled = 0 THEN 1 ELSE 0 END) as disabled_guilds
      FROM features f
      LEFT JOIN guild_features gf ON f.feature_name = gf.feature_name
      GROUP BY f.feature_name, f.description, f.minimum_package, f.is_active
      ORDER BY f.feature_name
    `);

    console.log('Admin features query result:', features);

    return NextResponse.json({
      success: true,
      features: features || []
    });
    
  } catch (error) {
    console.error('Error fetching admin features:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      },
      { status: 500 }
    );
  }
}
