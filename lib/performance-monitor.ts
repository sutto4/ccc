interface PerformanceMetric {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  error?: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  start(operation: string, id?: string, metadata?: Record<string, any>): string {
    const metricId = id || `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    this.metrics.set(metricId, {
      id: metricId,
      operation,
      startTime,
      metadata
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] 🚀 Started: ${operation} (${metricId})`);
    }

    return metricId;
  }

  end(metricId: string, error?: string): PerformanceMetric | null {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      console.warn(`[PERF] ⚠️ Metric not found: ${metricId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    metric.error = error;

    if (process.env.NODE_ENV === 'development') {
      const status = error ? '❌' : '✅';
      const color = duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢';
      console.log(`[PERF] ${status} ${color} Completed: ${metric.operation} - ${duration.toFixed(2)}ms (${metricId})`);
      
      if (error) {
        console.error(`[PERF] Error in ${metric.operation}:`, error);
      }
    }

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.size > 100) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }

    return metric;
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    const allMetrics = Array.from(this.metrics.values());
    return operation ? allMetrics.filter(m => m.operation === operation) : allMetrics;
  }

  getAverageDuration(operation: string): number {
    const metrics = this.getMetrics(operation).filter(m => m.duration !== undefined);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }

  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return this.getMetrics()
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  clear(): void {
    this.metrics.clear();
  }

  // Helper method for async operations
  async measure<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const metricId = this.start(operation, undefined, metadata);
    try {
      const result = await fn();
      this.end(metricId);
      return result;
    } catch (error) {
      this.end(metricId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // Helper method for sync operations
  measureSync<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    const metricId = this.start(operation, undefined, metadata);
    try {
      const result = fn();
      this.end(metricId);
      return result;
    } catch (error) {
      this.end(metricId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

export const perfMonitor = PerformanceMonitor.getInstance();

// Convenience functions
export const startPerf = (operation: string, id?: string, metadata?: Record<string, any>) => 
  perfMonitor.start(operation, id, metadata);

export const endPerf = (metricId: string, error?: string) => 
  perfMonitor.end(metricId, error);

export const measurePerf = <T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>) => 
  perfMonitor.measure(operation, fn, metadata);

export const measurePerfSync = <T>(operation: string, fn: () => T, metadata?: Record<string, any>) => 
  perfMonitor.measureSync(operation, fn, metadata);

