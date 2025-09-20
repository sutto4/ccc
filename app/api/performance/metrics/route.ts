import { NextRequest, NextResponse } from 'next/server';
import { perfMonitor } from '@/lib/performance-monitor';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const metrics = perfMonitor.getMetrics();
    const slowest = perfMonitor.getSlowestOperations(10);
    
    // Calculate summary statistics
    const operationStats = metrics.reduce((acc, metric) => {
      if (!metric.duration) return acc;
      
      const op = metric.operation;
      if (!acc[op]) {
        acc[op] = {
          count: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          errors: 0
        };
      }
      
      acc[op].count++;
      acc[op].totalDuration += metric.duration;
      acc[op].minDuration = Math.min(acc[op].minDuration, metric.duration);
      acc[op].maxDuration = Math.max(acc[op].maxDuration, metric.duration);
      if (metric.error) acc[op].errors++;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.keys(operationStats).forEach(op => {
      operationStats[op].avgDuration = operationStats[op].totalDuration / operationStats[op].count;
    });

    return NextResponse.json({
      metrics: metrics.slice(-100), // Last 100 metrics
      slowest,
      operationStats,
      summary: {
        totalMetrics: metrics.length,
        totalOperations: Object.keys(operationStats).length,
        averageResponseTime: metrics
          .filter(m => m.duration)
          .reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.filter(m => m.duration).length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    perfMonitor.clear();
    return NextResponse.json({ message: 'Performance metrics cleared' });
  } catch (error) {
    console.error('Error clearing performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to clear performance metrics' },
      { status: 500 }
    );
  }
}

