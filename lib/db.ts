import { getServerSession } from "next-auth";
import mysql from "mysql2/promise";
import { env } from "@/lib/env";

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
      connectionLimit: 5, // Conservative limit to prevent leaks
      waitForConnections: true,
      queueLimit: 10,
      // Add connection lifecycle management
      idleTimeout: 60000, // 1 minute - release idle connections quickly
      // Only include valid MySQL2 pool options
      supportBigNumbers: true,
      bigNumberStrings: true
    });
  }
  return pool;
}

// Force recreate pool if we have connection issues (moved to bottom of file)

export async function query(sql: string, params?: any[]): Promise<any> {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
    throw new Error('Database not configured');
  }
  
  // For connection limit errors, don't retry - just fail fast
  if (sql.includes('server_access_control') && env.NODE_ENV === 'production') {
    // Fast path for permission checks - single attempt only
    try {
      const p = getPool();
      const [rows] = await p.execute(sql, params || []);
      return rows;
    } catch (error: any) {
      if (error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
        // For connection limit errors, just throw immediately
        console.log('[DB] Connection limit reached, failing fast for permission check');
        throw new Error('Database temporarily unavailable');
      }
      throw error;
    }
  }
  
  // For other queries, use limited retry logic
  const maxRetries = 2; // Reduced from 3
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const p = getPool();
      const [rows] = await p.execute(sql, params || []);
      
      if (attempt > 1) {
        console.log(`[DB] Query succeeded on attempt ${attempt}`);
      }
      
      return rows;
    } catch (error: any) {
      lastError = error;
      
      // For connection limit errors, don't retry
      if (error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
        console.log('[DB] Connection limit reached, failing immediately');
        throw new Error('Database temporarily unavailable');
      }
      
      // Only retry for specific recoverable errors
      if (attempt < maxRetries && (
          error.code === 'ECONNREFUSED' ||
          error.code === 'PROTOCOL_CONNECTION_LOST' ||
          error.message === 'Pool is closed.'
        )) {
        
        console.log(`[DB] Recoverable error on attempt ${attempt}, retrying...`);
        pool = null; // Force pool recreation
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }
      
      // For all other errors, fail immediately
      break;
    }
  }
  
  throw lastError;
}

export async function isAdmin(discordId: string): Promise<boolean> {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) return false;
  
  try {
    const p = getPool();
    const [rows] = await p.execute(
      "SELECT role FROM users WHERE discord_id = ? LIMIT 1",
      [discordId]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const first = (rows as any[])[0] as any;
      return first?.role === "admin" || first?.role === "owner";
    }
    return false;
  } catch (error) {
    console.error('isAdmin error:', error);
    return false;
  }
}

export async function upsertUser({ email, discord_id, name, role }: { email: string, discord_id: string, name: string, role?: string }) {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) return;
  
  try {
    const p = getPool();
    await p.execute(
      `INSERT INTO users (email, discord_id, name, role) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email=VALUES(email), name=VALUES(name), role=COALESCE(VALUES(role), role)`,
      [email, discord_id, name, role || null]
    );
  } catch (error) {
    console.error('upsertUser error:', error);
    throw error;
  }
}

// Cleanup function for graceful shutdown
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Reset pool function (for fixing connection issues)
export async function resetPool(): Promise<void> {
  console.log('[DB] Resetting connection pool...');
  try {
    if (pool) {
      console.log('[DB] Closing existing pool...');
      await Promise.race([
        pool.end(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      console.log('[DB] Pool closed successfully');
    }
  } catch (error) {
    console.log('[DB] Error during pool reset:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    pool = null;
    console.log('[DB] Pool reset completed - next query will create fresh pool');
  }
}

// Debug function to check pool status
export function getPoolStatus() {
  if (!pool) return { status: 'no-pool' };
  
  return {
    status: 'active',
    connectionLimit: 15,
    queueLimit: 20,
    supportBigNumbers: true,
    message: 'Pool is active and configured for concurrent requests'
  };
}

// Health check function for monitoring
export async function healthCheck(): Promise<{ healthy: boolean; details: any }> {
  try {
    const startTime = Date.now();
    await query('SELECT 1 as health_check');
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      details: {
        responseTime: `${responseTime}ms`,
        poolStatus: getPoolStatus(),
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        poolStatus: getPoolStatus(),
        timestamp: new Date().toISOString()
      }
    };
  }
}
