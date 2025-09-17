import { getServerSession } from "next-auth";
import mysql from "mysql2/promise";
import { env } from "@/lib/env";

let pool: mysql.Pool | null = null;

// Ensure a single pool instance across module reloads/workers
function getGlobalPool(): mysql.Pool | null {
  const g = globalThis as unknown as { __MYSQL_POOL__?: mysql.Pool | null };
  return g.__MYSQL_POOL__ ?? null;
}

function setGlobalPool(p: mysql.Pool | null) {
  const g = globalThis as unknown as { __MYSQL_POOL__?: mysql.Pool | null };
  g.__MYSQL_POOL__ = p;
}

function getPool(): mysql.Pool {
  // Reuse global pool to avoid multiple pools and leaked Sleep connections
  const existing = getGlobalPool();
  if (existing) {
    pool = existing;
    return existing;
  }

  const created = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    connectionLimit: 8,
    waitForConnections: true,
    queueLimit: 20,
    // Lifecycle tuning: keep few idles, close quickly
    maxIdle: 2,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    supportBigNumbers: true,
    bigNumberStrings: true
  });

  pool = created;
  setGlobalPool(created);
  return created;
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
      
      // For connection limit errors, trigger emergency cleanup
      if (error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
        // Do NOT reset the pool here; failing fast prevents thrashing and new pool creation
        console.log('[DB] Connection limit reached, failing fast');
        throw error;
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
    setGlobalPool(null);
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
    setGlobalPool(null);
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

// Emergency connection cleanup - run this when we hit connection limits
export async function emergencyCleanup(): Promise<void> {
  console.log('[DB] EMERGENCY: Resetting connection pool due to connection limit');
  try {
    if (pool) {
      await pool.end();
    }
  } catch (error) {
    console.log('[DB] Error during emergency cleanup:', error);
  } finally {
    pool = null;
    setGlobalPool(null);
    console.log('[DB] Emergency cleanup completed - pool reset');
  }
}

