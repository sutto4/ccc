// Fallback memory cache when Redis is not available
interface CacheEntry {
  value: any;
  expires: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // Maximum number of entries

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  set(key: string, value: any, ttl?: number): boolean {
    try {
      // Clean up expired entries if cache is getting full
      if (this.cache.size >= this.maxSize) {
        this.cleanup();
      }
      
      const expires = ttl ? Date.now() + (ttl * 1000) : Date.now() + (5 * 60 * 1000); // Default 5 minutes
      this.cache.set(key, { value, expires });
      return true;
    } catch (error) {
      console.error('[MEMORY-CACHE] Set error:', error);
      return false;
    }
  }

  del(key: string): boolean {
    try {
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error('[MEMORY-CACHE] Delete error:', error);
      return false;
    }
  }

  exists(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  mget(keys: string[]): (any | null)[] {
    return keys.map(key => this.get(key));
  }

  mset(keyValuePairs: Record<string, any>, ttl?: number): boolean {
    try {
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        this.set(key, value, ttl);
      });
      return true;
    } catch (error) {
      console.error('[MEMORY-CACHE] Mset error:', error);
      return false;
    }
  }

  flush(): boolean {
    try {
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('[MEMORY-CACHE] Flush error:', error);
      return false;
    }
  }

  getStats(): {
    connected: boolean;
    memory: any;
    keys: number;
    info: any;
  } {
    return {
      connected: true,
      memory: {
        used_memory_human: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        used_memory_peak_human: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      },
      keys: this.cache.size,
      info: { type: 'memory-cache' }
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
let memoryCache: MemoryCache | null = null;

export function getMemoryCache(): MemoryCache {
  if (!memoryCache) {
    memoryCache = new MemoryCache();
  }
  return memoryCache;
}

// Convenience functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  return getMemoryCache().get<T>(key);
}

export async function cacheSet(key: string, value: any, ttl?: number): Promise<boolean> {
  return getMemoryCache().set(key, value, ttl);
}

export async function cacheDel(key: string): Promise<boolean> {
  return getMemoryCache().del(key);
}

export async function cacheExists(key: string): Promise<boolean> {
  return getMemoryCache().exists(key);
}

export async function cacheMget(keys: string[]): Promise<(any | null)[]> {
  return getMemoryCache().mget(keys);
}

export async function cacheMset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
  return getMemoryCache().mset(keyValuePairs, ttl);
}

export async function cacheFlush(): Promise<boolean> {
  return getMemoryCache().flush();
}

export async function cacheStats() {
  return getMemoryCache().getStats();
}

