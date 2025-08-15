
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter(30, 60_000);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id: guildId } = await params;
	if (!/^[0-9]{5,20}$/.test(guildId)) {
		return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
	}

	const ip = req.headers.get("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:emojis:${ip}:${guildId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } });

	const cacheKey = `emojis:${guildId}`;
	const cached = cache.get<any[]>(cacheKey);
	if (cached) return NextResponse.json({ emojis: cached });

	const botToken = env.DISCORD_BOT_TOKEN;
	if (!botToken) {
		const mock = [
			{ id: "emoji1", name: "👍", animated: false },
			{ id: "emoji2", name: "❤️", animated: false },
			{ id: "emoji3", name: "🎉", animated: false }
		];
		cache.set(cacheKey, mock, 60_000);
		return NextResponse.json({ emojis: mock });
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8000);
	let res: Response;
	try {
		res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
			headers: { Authorization: `Bot ${botToken}` },
			signal: controller.signal,
		});
	} catch (err: any) {
		if (err?.name === 'AbortError') return NextResponse.json({ error: "Discord emojis API timed out" }, { status: 504 });
		return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
	} finally {
		clearTimeout(timeout);
	}
	if (!res.ok) {
		const errText = await res.text();
		return NextResponse.json({ error: errText || "Failed to fetch emojis from Discord" }, { status: res.status });
	}
	const data = await res.json();
	cache.set(cacheKey, data, 120_000);
	return NextResponse.json({ emojis: data });
}
