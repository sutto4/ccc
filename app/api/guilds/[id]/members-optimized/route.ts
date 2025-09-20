import { NextRequest, NextResponse } from "next/server";
import { getToken } from 'next-auth/jwt';
import { query } from "@/lib/db";
import { perfMonitor, measurePerf } from "@/lib/performance-monitor";
import { cacheGet, cacheSet, cacheMget, cacheMset } from "@/lib/memory-cache";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache keys
const CACHE_KEYS = {
  MEMBERS: (guildId: string, limit: number, after: string, search: string, role: string) => 
    `members:${guildId}:${limit}:${after}:${search}:${role}`,
  ROLES: (guildId: string) => `roles:${guildId}`,
  GUILD_MEMBERS_COUNT: (guildId: string) => `guild-members-count:${guildId}`
};

// Cache TTLs (in seconds)
const CACHE_TTLS = {
  MEMBERS: 120, // 2 minutes
  ROLES: 300,   // 5 minutes
  GUILD_MEMBERS_COUNT: 600 // 10 minutes
};

async function fetchMembersFromBot(guildId: string, limit: number, after: string, search: string, role: string) {
  return measurePerf('bot-members-api-fetch', async () => {
    const base = process.env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
    
    if (!base) {
      throw new Error('Bot API not configured');
    }

    const hasApiSuffix = /\/api$/i.test(base);
    const primaryUrl = hasApiSuffix
      ? `${base}/guilds/${guildId}/members`
      : `${base}/api/guilds/${guildId}/members`;
    
    const urlParams = new URLSearchParams();
    if (limit) urlParams.set('limit', limit.toString());
    if (after) urlParams.set('after', after);
    if (search) urlParams.set('q', search);
    if (role) urlParams.set('role', role);
    
    const queryString = urlParams.toString();
    const url = queryString ? `${primaryUrl}?${queryString}` : primaryUrl;
    
    const response = await fetch(url, { cache: "no-store" });
    
    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`);
    }
    
    return response.json();
  }, { guildId, limit, after, search, role });
}

async function fetchRolesFromBot(guildId: string) {
  return measurePerf('bot-roles-api-fetch', async () => {
    const base = process.env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
    
    if (!base) {
      throw new Error('Bot API not configured');
    }

    const hasApiSuffix = /\/api$/i.test(base);
    const primaryUrl = hasApiSuffix
      ? `${base}/guilds/${guildId}/roles`
      : `${base}/api/guilds/${guildId}/roles`;
    
    const response = await fetch(primaryUrl, { cache: "no-store" });
    
    if (!response.ok) {
      throw new Error(`Bot API error: ${response.status}`);
    }
    
    return response.json();
  }, { guildId });
}

async function getGuildMembersCount(guildId: string) {
  return measurePerf('guild-members-count', async () => {
    // Check cache first
    const cached = await cacheGet(CACHE_KEYS.GUILD_MEMBERS_COUNT(guildId));
    if (cached !== null) {
      return cached;
    }

    // Get count from guilds table (member_count field)
    try {
      const result = await query(
        'SELECT member_count FROM guilds WHERE guild_id = ?',
        [guildId]
      );
      const count = result[0]?.member_count || 0;
      
      // Cache the result
      await cacheSet(CACHE_KEYS.GUILD_MEMBERS_COUNT(guildId), count, CACHE_TTLS.GUILD_MEMBERS_COUNT);
      
      return count;
    } catch (error) {
      console.warn('Failed to get guild members count from database:', error);
      return 0;
    }
  });
}

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return measurePerf('members-api-optimized-total', async () => {
    const token = await getToken({
      req: req,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token || !(token as any).discordId) {
      return NextResponse.json(
        { error: 'Authentication required', redirectTo: '/signin' },
        { status: 401, headers: { 'X-Auth-Required': 'true', 'X-Redirect-To': '/signin' } }
      );
    }

    const { id: guildId } = await params;
    if (!/^[0-9]{5,20}$/.test(guildId)) {
      return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
    }

    // Parse pagination and search parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const after = searchParams.get('after') || '0';
    const search = searchParams.get('q') || '';
    const role = searchParams.get('role') || '';

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.MEMBERS(guildId, limit, after, search, role);
      const cached = await cacheGet(cacheKey);
      if (cached) {
        console.log(`[PERF] ✅ Cache hit for members: ${guildId}`);
        return NextResponse.json(cached);
      }

      // Fetch members and roles in parallel
      const [membersData, rolesData, membersCount] = await Promise.all([
        fetchMembersFromBot(guildId, limit, after, search, role),
        fetchRolesFromBot(guildId),
        getGuildMembersCount(guildId)
      ]);

      // Handle both old format (array) and new format (paged object)
      let response;
      if (Array.isArray(membersData)) {
        // Old format - convert to paged format
        const offset = after ? parseInt(after) : 0;
        const paginatedMembers = membersData.slice(offset, offset + limit);
        response = {
          members: paginatedMembers,
          page: {
            nextAfter: offset + limit < membersData.length ? String(offset + limit) : null,
            total: membersData.length
          },
          roles: rolesData,
          membersCount
        };
      } else {
        // New format - use as is
        response = {
          ...membersData,
          roles: rolesData,
          membersCount
        };
      }

      // Cache the response
      await cacheSet(cacheKey, response, CACHE_TTLS.MEMBERS);

      // Log performance summary
      const slowest = perfMonitor.getSlowestOperations(3);
      console.log(`[PERF] 🎯 Optimized members API completed - ${response.members?.length || 0} members returned`);
      console.log(`[PERF] 📊 Slowest operations:`, slowest.map(m => `${m.operation}: ${m.duration?.toFixed(0)}ms`));

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error in optimized members API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
};

