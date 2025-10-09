import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  
  try {
    const [guild] = await query(
      'SELECT premium FROM guilds WHERE guild_id = ?',
      [guildId]
    ) as any[];
    
    const isPremium = guild?.premium === 1;
    
    return NextResponse.json({ isPremium });
  } catch (error) {
    console.error('[PREMIUM-STATUS] Error checking premium status:', error);
    return NextResponse.json({ isPremium: false });
  }
};

