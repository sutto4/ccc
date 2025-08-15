import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter(30, 60_000); // 30 req/min per ip+route

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id: guildId } = await params;
	if (!/^[0-9]{5,20}$/.test(guildId)) {
		return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
	}

	// rate limit
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const key = `rl:channels:${ip}:${guildId}`;
	const rl = limiter.check(key);
	if (!rl.allowed) {
		return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } });
	}

	// cache
	const cacheKey = `channels:${guildId}`;
	const cached = cache.get<any[]>(cacheKey);
	if (cached) return NextResponse.json({ channels: cached });

	const discordBotToken = env.DISCORD_BOT_TOKEN;
	if (!discordBotToken) {
		const mock = [
			{ id: "1234567890", name: "general", type: 0 },
			{ id: "1234567891", name: "announcements", type: 0 },
			{ id: "1234567892", name: "Voice Channel", type: 2 }
		];
		cache.set(cacheKey, mock, 60_000);
		return NextResponse.json({ channels: mock });
	}

	try {
		const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
			headers: { Authorization: `Bot ${discordBotToken}` },
		});
		if (!res.ok) {
			const errText = await res.text();
			return NextResponse.json({ error: errText }, { status: res.status });
		}
		const channels = await res.json();
		cache.set(cacheKey, channels, 120_000);
		return NextResponse.json({ channels });
	} catch (e: any) {
		return NextResponse.json({ error: e.message }, { status: 500 });
	}
}
