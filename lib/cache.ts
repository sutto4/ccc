type CacheEntry<T> = { value: T; expiresAt: number };

class SimpleTTLCache {
	private store = new Map<string, CacheEntry<unknown>>();

	get<T>(key: string): T | null {
		const hit = this.store.get(key);
		if (!hit) return null;
		if (Date.now() > hit.expiresAt) {
			this.store.delete(key);
			return null;
		}
		return hit.value as T;
	}

	set<T>(key: string, value: T, ttlMs: number): void {
		this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
	}

	delete(key: string): void {
		this.store.delete(key);
	}
}

export const cache = new SimpleTTLCache();

