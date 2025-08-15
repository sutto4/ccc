
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
	const rl = limiter.check(`rl:roles:${ip}:${guildId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } });

	const cacheKey = `roles:${guildId}`;
	const cached = cache.get<any[]>(cacheKey);
	if (cached) return NextResponse.json({ roles: cached });

	const botToken = env.DISCORD_BOT_TOKEN;
	if (!botToken) {
		const mock = [
			{ guildId, roleId: "role1", name: "@everyone", color: null, managed: false, editableByBot: true },
			{ guildId, roleId: "role2", name: "Admin", color: "#ff0000", managed: false, editableByBot: true },
			{ guildId, roleId: "role3", name: "Member", color: "#00ff00", managed: false, editableByBot: true }
		];
		cache.set(cacheKey, mock, 60_000);
		return NextResponse.json({ roles: mock });
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 8000);
	let res: Response;
	try {
		res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
			headers: { Authorization: `Bot ${botToken}` },
			signal: controller.signal,
		});
	} catch (err: any) {
		if (err?.name === 'AbortError') return NextResponse.json({ error: "Discord roles API timed out" }, { status: 504 });
		return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
	} finally {
		clearTimeout(timeout);
	}
	if (!res.ok) {
		const errText = await res.text();
		return NextResponse.json({ error: errText || "Failed to fetch roles from Discord" }, { status: res.status });
	}
	const data = await res.json();
	const normalized = (Array.isArray(data) ? data : []).map((r: any) => {
		const hexColor = typeof r.color === 'number' && r.color > 0
			? `#${Number(r.color).toString(16).padStart(6, '0')}`
			: null;
		const iconUrl = r.icon ? `https://cdn.discordapp.com/role-icons/${r.id}/${r.icon}.png` : null;
		const unicodeEmoji = r.unicode_emoji ?? null;
		return {
			guildId,
			roleId: String(r.id ?? r.roleId ?? ''),
			name: String(r.name ?? ''),
			color: hexColor,
			position: typeof r.position === 'number' ? r.position : 0,
			managed: Boolean(r.managed),
			editableByBot: r.tags?.bot_id ? false : true,
			iconUrl,
			unicodeEmoji,
		};
	});
	cache.set(cacheKey, normalized, 120_000);
	return NextResponse.json({ roles: normalized });
}
