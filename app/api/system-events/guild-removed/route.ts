import { NextRequest, NextResponse } from 'next/server';
import { SystemLogger } from '@/lib/system-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = async (req: NextRequest) => {
  try {
    const secret = req.headers.get('x-system-secret');
    if (!process.env.SYSTEM_EVENTS_SECRET || secret !== process.env.SYSTEM_EVENTS_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const guildId = String(body.guildId || body.guild_id || 'unknown');
    const guildName = body.guildName || body.guild_name || undefined;
    const actorId = body.actorId || body.actor_id || null;
    const actorName = body.actorName || body.actor_name || null;

    await SystemLogger.logGuildRemoved(
      guildId,
      actorId ? { id: String(actorId), name: actorName } : null,
      guildName,
      req
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
};


