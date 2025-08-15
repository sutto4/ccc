type Key = string;

export type RateLimitResult = { allowed: boolean; retryAfterMs?: number };

class MemoryRateLimiter {
	private hits = new Map<Key, { count: number; windowStart: number }>();

	constructor(private limit: number, private windowMs: number) {}

	check(key: Key): RateLimitResult {
		const now = Date.now();
		const rec = this.hits.get(key);
		if (!rec || now - rec.windowStart > this.windowMs) {
			this.hits.set(key, { count: 1, windowStart: now });
			return { allowed: true };
		}
		rec.count += 1;
		if (rec.count <= this.limit) return { allowed: true };
		const retryAfterMs = this.windowMs - (now - rec.windowStart);
		return { allowed: false, retryAfterMs };
	}
}

export function createRateLimiter(limit: number, windowMs: number) {
	return new MemoryRateLimiter(limit, windowMs);
}

