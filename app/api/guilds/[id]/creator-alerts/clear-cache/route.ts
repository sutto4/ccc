import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

// POST clear cache for a guild
export const POST = withAuth(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id: guildId } = await params;
  
  try {
    // Clear all cache entries for this guild
    const result = await query(
      `DELETE FROM creator_alert_cache WHERE cache_key LIKE ?`,
      [`creator_alert_${guildId}_%`]
    );
    
    console.log(`[CREATOR-ALERTS] Cleared cache for guild ${guildId}`);
    
    return NextResponse.json({ 
      ok: true, 
      message: `Cache cleared for guild ${guildId}`,
      deletedCount: (result as any).affectedRows || 0
    });
  } catch (error) {
    console.error(`[CREATOR-ALERTS] Error clearing cache for guild ${guildId}:`, error);
    return NextResponse.json({ 
      error: "Failed to clear cache" 
    }, { status: 500 });
  }
});
