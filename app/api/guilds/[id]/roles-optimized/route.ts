import { NextRequest, NextResponse } from "next/server";
import { getToken } from 'next-auth/jwt';
import { perfMonitor, measurePerf } from "@/lib/performance-monitor";
import { cacheGet, cacheSet } from "@/lib/memory-cache";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache keys
const CACHE_KEYS = {
  ROLES: (guildId: string) => `roles:${guildId}`
};

// Cache TTLs (in seconds)
const CACHE_TTLS = {
  ROLES: 300 // 5 minutes
};

async function fetchRolesFromBot(guildId: string) {
  return measurePerf('bot-roles-api-fetch-optimized', async () => {
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

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return measurePerf('roles-api-optimized-total', async () => {
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

    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.ROLES(guildId);
      const cached = await cacheGet(cacheKey);
      if (cached) {
        console.log(`[PERF] ✅ Cache hit for roles: ${guildId}`);
        return NextResponse.json(cached);
      }

      // Fetch roles from bot
      const rolesData = await fetchRolesFromBot(guildId);

      // Cache the response
      await cacheSet(cacheKey, rolesData, CACHE_TTLS.ROLES);

      console.log(`[PERF] 🎯 Optimized roles API completed - ${rolesData?.length || 0} roles returned`);

      return NextResponse.json(rolesData);
    } catch (error) {
      console.error('Error in optimized roles API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
};

