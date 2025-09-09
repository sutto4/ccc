import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache";
import { createRateLimiter } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { getToken } from 'next-auth/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter(30, 60_000);

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Simple auth validation
  const token = await getToken({
    req: req,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token || !(token as any).discordId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        message: 'Please login to continue',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }

  const accessToken = (token as any).accessToken as string;
  const discordId = (token as any).discordId as string;

  if (!accessToken || !discordId) {
    return NextResponse.json(
      {
        error: 'Authentication expired',
        message: 'Please login again',
        redirectTo: '/signin'
      },
      {
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
          'X-Redirect-To': '/signin'
        }
      }
    );
  }
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
	console.log('🔍 Members API: SERVER_API_BASE_URL =', base);
	
	if (base) {
		const hasApiSuffix = /\/api$/i.test(base);
		const primaryUrl = hasApiSuffix
			? `${base}/guilds/${guildId}/members`
			: `${base}/api/guilds/${guildId}/members`;
		const fallbackUrl = hasApiSuffix
			? `${base.replace(/\/api$/i, "")}/api/guilds/${guildId}/members`
			: `${base}/guilds/${guildId}/members`;
		try {
			console.log('🔍 Members API: Trying primary URL:', primaryUrl);
			let res = await fetch(primaryUrl, { cache: "no-store" });
			console.log('🔍 Members API: Primary response status:', res.status);
			
			if (!res.ok && (res.status === 404 || res.status === 405)) {
				console.log('🔍 Members API: Primary failed, trying fallback');
				res = await fetch(fallbackUrl, { cache: "no-store" });
				console.log('🔍 Members API: Fallback response status:', res.status);
			}
			
			if (!res.ok) {
				const errText = await res.text();
				console.log('🔍 Members API: Error response:', errText);
				return NextResponse.json({ error: errText || "Upstream error" }, { status: res.status });
			}
			
			const members = await res.json();
			console.log('🔍 Members API: Successfully fetched members:', members?.length || 0, 'members');
			console.log('🔍 Members API: First member sample:', members?.[0]);
			
			cache.set(cacheKey, members, 60_000);
			return NextResponse.json(members);
		} catch (e: any) {
			console.log('🔍 Members API: Fetch error:', e?.message);
			return NextResponse.json({ error: e?.message || "Proxy fetch failed" }, { status: 502 });
		}
	}

	// Fallback mock data to support local dev when no backend is available
	const mock = [
		{
			guildId,
			discordUserId: "111111111111111111",
			username: "sutto",
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
};

