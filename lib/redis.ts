// Lightweight Redis wrapper with safe fallback to null when Redis is unavailable
// Usage: const r = await getRedis(); if (r) { await r.set(key, val, 'EX', ttlSec); }

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
};

let cachedClient: RedisLike | null | undefined;

export async function getRedis(): Promise<RedisLike | null> {
  if (cachedClient !== undefined) return cachedClient as RedisLike | null;
  const url = process.env.REDIS_URL;
  if (!url) {
    cachedClient = null;
    return null;
  }
  try {
    // Lazy import ioredis to avoid hard dependency if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = (await import('ioredis')).default as any;
    const client = new Redis(url);
    cachedClient = client as RedisLike;
    return cachedClient as RedisLike;
  } catch (e) {
    console.warn('[REDIS] Not available, falling back to in-memory only. Reason:', (e as Error)?.message || e);
    cachedClient = null;
    return null;
  }
}

export async function redisGetJSON<T = unknown>(key: string): Promise<T | null> {
  const r = await getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), 'EX', Math.max(1, Math.floor(ttlSeconds)));
  } catch {
    // ignore
  }
}


