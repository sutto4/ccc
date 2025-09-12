import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db';
import { analyticsBatcher } from '@/lib/analytics-batcher';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database health
    const dbHealth = await healthCheck();
    
    // Check analytics batcher status
    const analyticsStatus = analyticsBatcher.getStatus();
    
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: dbHealth,
      analytics: {
        status: 'operational',
        ...analyticsStatus
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    return NextResponse.json(health, {
      status: dbHealth.healthy ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}