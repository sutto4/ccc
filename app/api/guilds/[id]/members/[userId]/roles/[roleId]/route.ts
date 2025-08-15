import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const limiter = createRateLimiter(20, 60_000); // 20 req/min per ip+endpoint

function badRequest(msg: string) {
	return NextResponse.json({ error: msg }, { status: 400 });
}

async function handleProxy(method: 'POST' | 'DELETE', guildId: string, userId: string, roleId: string, actor: string | null) {
	const base = env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
	if (!base) {
		return NextResponse.json({ error: "Role edit not implemented locally. Configure SERVER_API_BASE_URL to proxy to your bot/backend." }, { status: 501 });
	}
	const qs = actor ? `?actor=${encodeURIComponent(actor)}` : '';
	// Bot classic endpoints are mounted under /api
	const url = `${base}/api/guilds/${guildId}/members/${userId}/roles/${roleId}${qs}`;
	const res = await fetch(url, { method, headers: { 'content-type': 'application/json' } });
	const text = await res.text();
	if (!res.ok) {
		return NextResponse.json({ error: text || `Upstream error ${res.status}` }, { status: res.status });
	}
	try {
		const json = JSON.parse(text);
		return NextResponse.json(json);
	} catch {
		return NextResponse.json({ ok: true });
	}
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; userId: string; roleId: string }> }) {
	const { id: guildId, userId, roleId } = await params;
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:addrole:${ip}:${guildId}:${userId}:${roleId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
	if (!/^[0-9]{5,20}$/.test(guildId)) return badRequest("Invalid guild id");
	if (!/^[0-9]{5,20}$/.test(userId)) return badRequest("Invalid user id");
	if (!/^[0-9]{5,20}$/.test(roleId)) return badRequest("Invalid role id");
	const url = new URL(req.url);
	const actor = url.searchParams.get('actor');
	return handleProxy('POST', guildId, userId, roleId, actor);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; userId: string; roleId: string }> }) {
	const { id: guildId, userId, roleId } = await params;
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:removerole:${ip}:${guildId}:${userId}:${roleId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
	if (!/^[0-9]{5,20}$/.test(guildId)) return badRequest("Invalid guild id");
	if (!/^[0-9]{5,20}$/.test(userId)) return badRequest("Invalid user id");
	if (!/^[0-9]{5,20}$/.test(roleId)) return badRequest("Invalid role id");
	const url = new URL(req.url);
	const actor = url.searchParams.get('actor');
	return handleProxy('DELETE', guildId, userId, roleId, actor);
}

