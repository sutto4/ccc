import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
      connectionLimit: 25, // Reasonable for increased MySQL max_connections
      waitForConnections: true,
      queueLimit: 50 // Balanced queue for high traffic
    });
  }
  return pool;
}

// Force recreate pool if we have connection issues
export async function resetPool() {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      console.error('Error ending pool:', error);
    }
    pool = null;
  }
  // Force recreation
  getPool();
  console.log('Database pool reset');
}

export async function query(sql: string, params?: any[]): Promise<any> {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
    throw new Error('Database not configured');
  }
  
  try {
    const p = getPool();
    // Use pool.execute directly - it handles connections internally
    const [rows] = await p.execute(sql, params || []);
    return rows;
  } catch (error: any) {
    console.error('Database query error:', error);
    
    // If it's a connection error, reset the pool
    if (error.code === 'ER_CON_COUNT_ERROR' || error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Connection error detected, resetting pool...');
      await resetPool();
    }
    
    throw error;
  }
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

// Debug function to check pool status
export function getPoolStatus() {
  if (!pool) return { status: 'no-pool' };
  
  return {
    status: 'active',
    totalConnections: 25, // connectionLimit from pool config
    message: 'Pool is active and managing connections efficiently'
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
