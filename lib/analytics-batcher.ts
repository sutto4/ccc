import { query } from './db';

interface BatchedRequest {
  id: string;
  endpoint: string;
  method: string;
  userId?: string;
  userName?: string;
  discordId?: string;
  userAgent?: string;
  ip?: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  rateLimited: boolean;
  environment: string;
  instanceId: string;
  timestamp: string;
}

class AnalyticsBatcher {
  private batch: BatchedRequest[] = [];
  private batchSize = 50; // Process in batches of 50
  private flushInterval = 5000; // Flush every 5 seconds
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Temporarily disabled to prevent connection issues
    // this.startFlushTimer();
  }

  private startFlushTimer() {
    // Completely disabled to prevent any database issues
    // this.timer = setInterval(() => {
    //   this.flush();
    // }, this.flushInterval);
  }

  addRequest(request: Omit<BatchedRequest, 'timestamp'>) {
    // Completely disabled to prevent any database issues
    // const batchedRequest: BatchedRequest = {
    //   ...request,
    //   timestamp: new Date().toISOString()
    // };

    // this.batch.push(batchedRequest);

    // // Auto-flush if batch is full
    // if (this.batch.length >= this.batchSize) {
    //   this.flush();
    // }
  }

  private async flush() {
    if (this.isProcessing || this.batch.length === 0) {
      return;
    }

    this.isProcessing = true;
    const requestsToProcess = [...this.batch];
    this.batch = [];

    try {
      // Process in smaller chunks to avoid overwhelming the database
      const chunkSize = 10;
      for (let i = 0; i < requestsToProcess.length; i += chunkSize) {
        const chunk = requestsToProcess.slice(i, i + chunkSize);
        await this.processBatch(chunk);
        
        // Small delay between chunks to prevent overwhelming the database
        if (i + chunkSize < requestsToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`[ANALYTICS] Successfully processed ${requestsToProcess.length} requests`);
    } catch (error) {
      console.error('[ANALYTICS] Failed to process batch:', error);
      // Re-add failed requests to the batch (with limit to prevent memory issues)
      this.batch.unshift(...requestsToProcess.slice(0, 100));
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatch(requests: BatchedRequest[]) {
    if (requests.length === 0) return;

    const values = requests.map(req => [
      req.id,
      req.endpoint,
      req.method,
      req.userId || null,
      req.userName || null,
      req.discordId || null,
      req.userAgent || null,
      req.ip || null,
      req.statusCode,
      req.responseTime,
      req.error || null,
      req.rateLimited,
      req.environment,
      req.instanceId,
      req.timestamp,
      new Date().toISOString()
    ]);

    const placeholders = requests.map(() => 
      '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).join(', ');

    await query(
      `INSERT INTO api_requests
       (id, endpoint, method, user_id, user_name, discord_id, user_agent, ip_address, status_code, response_time, error_message, rate_limited, environment, instance_id, timestamp, created_at)
       VALUES ${placeholders}`,
      values.flat()
    );
  }

  // Force flush remaining requests (useful for graceful shutdown)
  async forceFlush() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  // Get current batch status for monitoring
  getStatus() {
    return {
      batchSize: this.batch.length,
      isProcessing: this.isProcessing,
      maxBatchSize: this.batchSize,
      flushInterval: this.flushInterval
    };
  }
}

// Singleton instance
export const analyticsBatcher = new AnalyticsBatcher();

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('[ANALYTICS] Gracefully shutting down analytics batcher...');
  await analyticsBatcher.forceFlush();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[ANALYTICS] Gracefully shutting down analytics batcher...');
  await analyticsBatcher.forceFlush();
  process.exit(0);
});
