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

	// Parse pagination and search parameters
	const { searchParams } = new URL(req.url);
	const limit = parseInt(searchParams.get('limit') || '100');
	const after = searchParams.get('after');
	const q = searchParams.get('q') || '';
	const role = searchParams.get('role') || '';

	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = limiter.check(`rl:members:${ip}:${guildId}`);
	if (!rl.allowed) {
		return NextResponse.json({ error: "Too Many Requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs || 0) / 1000)) } });
	}

	// Create cache key that includes pagination parameters
	const cacheKey = `members:${guildId}:${limit}:${after || '0'}:${q}:${role}`;
	const cached = cache.get<any>(cacheKey);
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
			// Add pagination parameters to the upstream request
			const urlParams = new URLSearchParams();
			if (limit) urlParams.set('limit', limit.toString());
			if (after) urlParams.set('after', after);
			if (q) urlParams.set('q', q);
			if (role) urlParams.set('role', role);
			
			const queryString = urlParams.toString();
			const primaryUrlWithParams = queryString ? `${primaryUrl}?${queryString}` : primaryUrl;
			const fallbackUrlWithParams = queryString ? `${fallbackUrl}?${queryString}` : fallbackUrl;
			
			let res = await fetch(primaryUrlWithParams, { cache: "no-store" });
			
			if (!res.ok && (res.status === 404 || res.status === 405)) {
				res = await fetch(fallbackUrlWithParams, { cache: "no-store" });
			}
			
			if (!res.ok) {
				const errText = await res.text();
				return NextResponse.json({ error: errText || "Upstream error" }, { status: res.status });
			}
			
			const data = await res.json();
			
			// Handle both old format (array) and new format (paged object)
			let response;
			if (Array.isArray(data)) {
				// Old format - convert to paged format
				const offset = after ? parseInt(after) : 0;
				const paginatedMembers = data.slice(offset, offset + limit);
				response = {
					members: paginatedMembers,
					page: {
						nextAfter: offset + limit < data.length ? String(offset + limit) : null,
						total: data.length
					}
				};
			} else {
				// New format - use as is
				response = data;
			}
			
			cache.set(cacheKey, response, 60_000);
			return NextResponse.json(response);
		} catch (e: any) {
			return NextResponse.json({ error: e?.message || "Proxy fetch failed" }, { status: 502 });
		}
	}

	// Fallback mock data to support local dev when no backend is available
	const mockMembers = [
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
		{
			guildId,
			discordUserId: "333333333333333333",
			username: "TestUser3",
			roleIds: ["role1", "role2"],
			accountid: null,
			groups: [],
			avatarUrl: "https://cdn.discordapp.com/embed/avatars/2.png",
		},
		{
			guildId,
			discordUserId: "444444444444444444",
			username: "TestUser4",
			roleIds: [],
			accountid: null,
			groups: [],
			avatarUrl: "https://cdn.discordapp.com/embed/avatars/3.png",
		},
		{
			guildId,
			discordUserId: "555555555555555555",
			username: "TestUser5",
			roleIds: ["role1"],
			accountid: null,
			groups: [],
			avatarUrl: "https://cdn.discordapp.com/embed/avatars/4.png",
		},
	];

	// Apply search and role filtering
	let filteredMembers = mockMembers;
	
	if (q) {
		const searchTerm = q.toLowerCase();
		filteredMembers = filteredMembers.filter(member => 
			member.username.toLowerCase().includes(searchTerm) ||
			member.discordUserId.toLowerCase().includes(searchTerm)
		);
	}
	
	if (role) {
		filteredMembers = filteredMembers.filter(member => 
			member.roleIds.includes(role)
		);
	}

	// Apply pagination
	const offset = after ? parseInt(after) : 0;
	const paginatedMembers = filteredMembers.slice(offset, offset + limit);
	
	const response = {
		members: paginatedMembers,
		page: {
			nextAfter: offset + limit < filteredMembers.length ? String(offset + limit) : null,
			total: filteredMembers.length
		}
	};
	
	cache.set(cacheKey, response, 60_000);
	return NextResponse.json(response);
};

