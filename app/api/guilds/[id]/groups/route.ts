import { NextResponse } from "next/server";
import { AuthMiddleware } from "@/lib/auth-middleware";
import { env } from "@/lib/env";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = AuthMiddleware.withAuth(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
	const { id: guildId } = await params;
	if (!/^[0-9]{5,20}$/.test(guildId)) {
		return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
	}

	// If an upstream bot/backend base is configured, proxy to it
	const base = env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
	
	if (base) {
		const hasApiSuffix = /\/api$/i.test(base);
		const primaryUrl = hasApiSuffix
			? `${base}/guilds/${guildId}/groups`
			: `${base}/api/guilds/${guildId}/groups`;
		const fallbackUrl = hasApiSuffix
			? `${base.replace(/\/api$/i, "")}/api/guilds/${guildId}/groups`
			: `${base}/guilds/${guildId}/groups`;
		
		try {
			let res = await fetch(primaryUrl, { cache: "no-store" });
			
			if (!res.ok && (res.status === 404 || res.status === 405)) {
				res = await fetch(fallbackUrl, { cache: "no-store" });
			}
			
			if (!res.ok) {
				const errText = await res.text();
				return NextResponse.json({ error: errText || "Upstream error" }, { status: res.status });
			}
			
			const groups = await res.json();
			return NextResponse.json(groups);
		} catch (e: any) {
			return NextResponse.json({ error: e?.message || "Proxy fetch failed" }, { status: 502 });
		}
	}

	// For now, return empty groups array
	// This should be replaced with actual database logic to fetch groups
	// where the current guild is a member
	const groups = [];

	return NextResponse.json({ groups });
});

