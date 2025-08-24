import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Test basic database connection
    const result = await query("SELECT 1 as test");
    console.log('Database test result:', result);
    
    // Test guilds table access
    const guildsCount = await query("SELECT COUNT(*) as count FROM guilds");
    console.log('Guilds count result:', guildsCount);
    
    // Test users table access
    const usersCount = await query("SELECT COUNT(*) as count FROM users");
    console.log('Users count result:', usersCount);
    
    return NextResponse.json({
      success: true,
      database: 'connected',
      guildsCount: Array.isArray(guildsCount) && guildsCount.length > 0 ? guildsCount[0].count : 0,
      usersCount: Array.isArray(usersCount) && usersCount.length > 0 ? usersCount[0].count : 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}
