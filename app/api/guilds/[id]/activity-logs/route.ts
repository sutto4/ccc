import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { queryLogs } from "@/lib/system-logger";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET activity logs for a guild
export const GET = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  try {
    // Use the system logger query function
    const result = await queryLogs({
      guildId: guildId,
      limit: limit,
      offset: offset
    });

    // Return logs with all needed fields (same as admin logs, but without details)
    return NextResponse.json({ 
      logs: result.logs,
      total: result.total 
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    
    // If table doesn't exist, return empty array
    return NextResponse.json({ logs: [], total: 0 });
  }
};

