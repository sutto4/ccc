import { NextResponse } from "next/server";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { withAuth } from "@/lib/authz";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter(30, 60_000);

export const GET = withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
	const { id: guildId } = await params;
	if (!/^[0-9]{5,20}$/.test(guildId)) {
		return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
	}

	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:members:${ip}:${guildId}`);
	if (!rl.allowed) {
		return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } });
	}

	const cacheKey = `members:${guildId}`;
	const cached = cache.get<any[]>(cacheKey);
	if (cached) return NextResponse.json(cached);

	// If an upstream bot/backend base is configured, proxy to it
	const base = env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
	if (base) {
		const hasApiSuffix = /\/api$/i.test(base);
		const primaryUrl = hasApiSuffix
			? `${base}/guilds/${guildId}/members`
			: `${base}/api/guilds/${guildId}/members`;
		const fallbackUrl = hasApiSuffix
			? `${base.replace(/\/api$/i, "")}/api/guilds/${guildId}/members`
			: `${base}/guilds/${guildId}/members`;
		try {
			let res = await fetch(primaryUrl, { cache: "no-store" });
			if (!res.ok && (res.status === 404 || res.status === 405)) {
				// Try alternate path shape
				res = await fetch(fallbackUrl, { cache: "no-store" });
			}
			if (!res.ok) {
				const errText = await res.text();
				return NextResponse.json({ error: errText || "Upstream error" }, { status: res.status });
			}
			const members = await res.json();
			cache.set(cacheKey, members, 60_000);
			return NextResponse.json(members);
		} catch (e: any) {
			return NextResponse.json({ error: e?.message || "Proxy fetch failed" }, { status: 502 });
		}
	}

	// Fallback mock data to support local dev when no backend is available
	const mock = [
		{
			guildId,
			discordUserId: "111111111111111111",
			username: "TestUser1",
			roleIds: ["role2"],
			accountid: null,
			groups: [],
			avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
		},
		{
			guildId,
			discordUserId: "222222222222222222",
			username: "TestUser2",
			roleIds: ["role3"],
			accountid: null,
			groups: [],
			avatarUrl: "https://cdn.discordapp.com/embed/avatars/1.png",
		},
	];
	cache.set(cacheKey, mock, 60_000);
	return NextResponse.json(mock);
});

