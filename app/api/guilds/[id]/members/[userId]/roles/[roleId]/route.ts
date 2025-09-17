import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { SystemLogger } from '@/lib/system-logger';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export const POST = async (
	req: Request, 
	{ params }: { params: Promise<{ id: string; userId: string; roleId: string }> }
) => {
	// Check authentication
	const auth = await authMiddleware(req as any);
	if (auth.error || !auth.user) {
		return createAuthResponse(auth.error || 'Unauthorized');
	}

	const { id: guildId, userId, roleId } = await params;
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:addrole:${ip}:${guildId}:${userId}:${roleId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
	if (!/^[0-9]{5,20}$/.test(guildId)) return badRequest("Invalid guild id");
	if (!/^[0-9]{5,20}$/.test(userId)) return badRequest("Invalid user id");
	if (!/^[0-9]{5,20}$/.test(roleId)) return badRequest("Invalid role id");
	const url = new URL(req.url);
	const actor = url.searchParams.get('actor');
	
	try {
		const result = await handleProxy('POST', guildId, userId, roleId, actor);
		
		// Log successful role assignment
		if (result.status === 200) {
			await SystemLogger.log({
				guildId,
				userId: auth.user.id || 'unknown',
				userName: auth.user.name || auth.user.username || 'Unknown User',
				userEmail: auth.user.email,
				userRole: auth.user.role || 'viewer',
				actionType: 'user_management',
				actionName: 'assign_role',
				targetType: 'user',
				targetId: userId,
				targetName: `User ${userId}`,
				newValue: { 
					roleId,
					action: 'added',
					actor: actor || auth.user.id 
				},
				metadata: {
					ip,
					userAgent: req.headers.get('user-agent')?.substring(0, 500)
				},
				status: 'success'
			});
		}
		
		return result;
	} catch (error) {
		// Log failed role assignment
		await SystemLogger.log({
			guildId,
			userId: auth.discordId || auth.id || 'unknown',
			userName: auth.name || auth.discordUsername || 'Unknown User',
			userEmail: auth.email,
			userRole: auth.role || 'viewer',
			actionType: 'user_management',
			actionName: 'assign_role',
			targetType: 'user',
			targetId: userId,
			targetName: `User ${userId}`,
			newValue: { roleId, action: 'add_failed' },
			status: 'failed',
			errorMessage: error instanceof Error ? error.message : 'Unknown error',
			metadata: { ip }
		});
		
		throw error;
	}
};

export const DELETE = async (
	req: Request, 
	{ params }: { params: Promise<{ id: string; userId: string; roleId: string }> }
) => {
	// Check authentication
	const auth = await authMiddleware(req as any);
	if (auth.error || !auth.user) {
		return createAuthResponse(auth.error || 'Unauthorized');
	}

	const { id: guildId, userId, roleId } = await params;
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:removerole:${ip}:${guildId}:${userId}:${roleId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
	if (!/^[0-9]{5,20}$/.test(guildId)) return badRequest("Invalid guild id");
	if (!/^[0-9]{5,20}$/.test(userId)) return badRequest("Invalid user id");
	if (!/^[0-9]{5,20}$/.test(roleId)) return badRequest("Invalid role id");
	const url = new URL(req.url);
	const actor = url.searchParams.get('actor');
	
	try {
		const result = await handleProxy('DELETE', guildId, userId, roleId, actor);
		
		// Log successful role removal
		if (result.status === 200) {
			await SystemLogger.log({
				guildId,
				userId: auth.user.id || 'unknown',
				userName: auth.user.name || auth.user.username || 'Unknown User',
				userEmail: auth.user.email,
				userRole: auth.user.role || 'viewer',
				actionType: 'user_management',
				actionName: 'remove_role',
				targetType: 'user',
				targetId: userId,
				targetName: `User ${userId}`,
				oldValue: { roleId, action: 'had_role' },
				newValue: { 
					roleId,
					action: 'removed',
					actor: actor || auth.user.id 
				},
				metadata: {
					ip,
					userAgent: req.headers.get('user-agent')?.substring(0, 500)
				},
				status: 'success'
			});
		}
		
		return result;
	} catch (error) {
		// Log failed role removal
		await SystemLogger.log({
			guildId,
			userId: auth.discordId || auth.id || 'unknown',
			userName: auth.name || auth.discordUsername || 'Unknown User',
			userEmail: auth.email,
			userRole: auth.role || 'viewer',
			actionType: 'user_management',
			actionName: 'remove_role',
			targetType: 'user',
			targetId: userId,
			targetName: `User ${userId}`,
			oldValue: { roleId, action: 'remove_failed' },
			status: 'failed',
			errorMessage: error instanceof Error ? error.message : 'Unknown error',
			metadata: { ip }
		});
		
		throw error;
	}
};

