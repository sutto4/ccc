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

    const payload = {
      guildId: String(body.guildId || body.guild_id || 'system'),
      userId: String(body.userId || body.user_id || 'system'),
      userName: body.userName || body.user_name || 'System',
      userEmail: body.userEmail || body.user_email,
      userRole: body.userRole || body.user_role || 'viewer',
      actionType: body.actionType || 'other',
      actionName: body.actionName || 'bot_event',
      targetType: body.targetType,
      targetId: body.targetId,
      targetName: body.targetName,
      oldValue: body.oldValue,
      newValue: body.newValue,
      metadata: body.metadata,
      status: body.status || 'success',
      errorMessage: body.errorMessage,
      request: req
    } as any;

    await SystemLogger.log(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[SYSTEM-LOG] Failed to receive log:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
};


