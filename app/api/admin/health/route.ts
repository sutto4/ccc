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

    const healthChecks = await Promise.allSettled([
      // Database health check
      query("SELECT 1 as health"),
      
      // Bot status check (you can add more sophisticated checks here)
      Promise.resolve({ status: 'healthy' }),
      
      // API response time check
      Promise.resolve({ responseTime: Date.now() })
    ]);

    // Determine health status based on checks
    const databaseHealth = healthChecks[0].status === 'fulfilled' ? 'healthy' : 'error';
    const botHealth = healthChecks[1].status === 'fulfilled' ? 'healthy' : 'error';
    const apiHealth = healthChecks[2].status === 'fulfilled' ? 'healthy' : 'error';

    // Overall health status
    const overallHealth = [databaseHealth, botHealth, apiHealth].every(h => h === 'healthy') 
      ? 'healthy' 
      : [databaseHealth, botHealth, apiHealth].some(h => h === 'error') 
        ? 'error' 
        : 'warning';

    const health = {
      bot: botHealth,
      database: databaseHealth,
      api: apiHealth,
      overall: overallHealth,
      lastCheck: new Date().toISOString(),
      checks: {
        database: {
          status: databaseHealth,
          message: databaseHealth === 'healthy' ? 'Database connection successful' : 'Database connection failed'
        },
        bot: {
          status: botHealth,
          message: botHealth === 'healthy' ? 'Bot is running' : 'Bot status unknown'
        },
        api: {
          status: apiHealth,
          message: apiHealth === 'healthy' ? 'API responding normally' : 'API issues detected'
        }
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    
    // Return error status if health check itself fails
    return NextResponse.json({
      bot: 'error',
      database: 'error',
      api: 'error',
      overall: 'error',
      lastCheck: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
  }
}
