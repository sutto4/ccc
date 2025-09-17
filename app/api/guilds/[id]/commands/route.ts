import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';
import { SystemLogger } from '@/lib/system-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guildId } = await params;
    const { query } = await import('@/lib/db');

    // Known commands catalog (for descriptions/categories)
    const catalog: Record<string, { description: string; category: string }> = {
      warn: { description: 'Warn a user for breaking rules', category: 'moderation' },
      kick: { description: 'Kick a user from the server', category: 'moderation' },
      ban: { description: 'Ban a user from the server', category: 'moderation' },
      mute: { description: 'Mute a user in the server', category: 'moderation' },
      unmute: { description: 'Unmute a user in the server', category: 'moderation' },
      role: { description: 'Manage user roles', category: 'moderation' },
      prune: { description: 'Prune inactive members', category: 'moderation' },
      setmodlog: { description: 'Set moderation log channel', category: 'moderation' },
      sticky: { description: 'Create sticky messages', category: 'messages' },
      unsticky: { description: 'Remove sticky messages', category: 'messages' },
      custom: { description: 'Execute custom commands', category: 'utilities' },
      embed: { description: 'Send embedded messages', category: 'utilities' },
      feedback: { description: 'Submit feedback', category: 'utilities' },
      sendverify: { description: 'Send verification message', category: 'verification' },
      setverifylog: { description: 'Set verification log channel', category: 'verification' },
    };
    
    // Try to proxy the request to the bot server
    try {
      const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
      const botResponse = await fetch(`${botUrl}/api/guilds/${guildId}/commands`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (botResponse.ok) {
        const data = await botResponse.json();

        // Overlay with DB states and union with catalog to ensure accuracy
        const rows = await query(
          'SELECT command_name, enabled FROM guild_commands WHERE guild_id = ?',
          [guildId]
        ) as any[];
        const dbMap = new Map<string, boolean>();
        for (const r of rows || []) {
          if (r && r.command_name) {
            dbMap.set(String(r.command_name), r.enabled === 1 || r.enabled === true);
          }
        }

        const botList: any[] = Array.isArray(data?.commands) ? data.commands : [];
        const botMap = new Map<string, { name: string; description?: string; category?: string; enabled?: boolean }>();
        for (const c of botList) {
          if (c?.name) botMap.set(c.name, c);
        }

        const names = Array.from(new Set([
          ...Object.keys(catalog),
          ...Array.from(dbMap.keys()),
          ...Array.from(botMap.keys()),
        ]));

        const merged = names.map((name) => ({
          name,
          description: catalog[name]?.description || botMap.get(name)?.description || 'Command',
          category: catalog[name]?.category || botMap.get(name)?.category || 'other',
          enabled: dbMap.has(name) ? (dbMap.get(name) as boolean) : (botMap.get(name)?.enabled ?? false),
        }));

        merged.sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)));
        return NextResponse.json({ success: true, guildId, commands: merged });
      }
    } catch (botError) {
      console.error('Bot server not available, using fallback:', botError);
    }
    
    // Fallback: Fetch from database directly and merge with catalog
    console.log('🚨🚨🚨 USING FALLBACK FOR GET COMMANDS! 🚨🚨🚨');

    // Known commands catalog (for descriptions/categories)

    // Pull actual states from DB
    const rows = await query(
      'SELECT command_name, enabled FROM guild_commands WHERE guild_id = ?',
      [guildId]
    ) as any[];

    const dbMap = new Map<string, boolean>();
    for (const r of rows || []) {
      if (r && r.command_name) {
        dbMap.set(String(r.command_name), r.enabled === 1 || r.enabled === true);
      }
    }

    // Union of catalog and DB
    const names = Array.from(new Set([...Object.keys(catalog), ...Array.from(dbMap.keys())]));
    const commands = names.map((name) => ({
      name,
      description: catalog[name]?.description || 'Command',
      category: catalog[name]?.category || 'other',
      enabled: dbMap.get(name) ?? false,
    }));

    // Optional: stable sort
    commands.sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)));

    return NextResponse.json({ success: true, guildId, commands });

  } catch (error) {
    console.error('Error fetching guild commands:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guildId = (await params).id;
  const auth = await authMiddleware(request);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }
  let body: any;
  
  try {
    body = await request.json();

    const cmds = Array.isArray(body?.commands) ? body.commands : [];
    const names = cmds.map((c: any) => c.command_name).filter(Boolean);

    // Load current DB state for only the submitted commands (to detect changes)
    const { query } = await import('@/lib/db');
    const currentRows = names.length > 0
      ? await query(
          `SELECT command_name, enabled FROM guild_commands WHERE guild_id = ? AND command_name IN (${names.map(() => '?').join(',')})`,
          [guildId, ...names]
        ) as any[]
      : [];
    const currentMap = new Map<string, boolean>();
    for (const r of currentRows || []) {
      currentMap.set(String(r.command_name), r.enabled === 1 || r.enabled === true);
    }
    
    // Proxy the request to the bot server
    const botUrl = process.env.BOT_API_URL || 'http://127.0.0.1:3001';
    try {
      const healthResponse = await fetch(`${botUrl}/api/commands/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      // Optional: log health status
      // console.log(`[WEB-APP] Bot server health check status: ${healthResponse.status}`);
    } catch {
      // Ignore health failure; still try proxy, then fallback
    }

    const botResponse = await fetch(`${botUrl}/api/guilds/${guildId}/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (botResponse.ok) {
      const data = await botResponse.json();

      // Log only changed commands
      try {
        const source = (request.headers.get('referer') || '').includes('/admin/') ? 'admin' : 'guild';
        for (const c of cmds) {
          const oldEnabled = currentMap.has(c.command_name) ? (currentMap.get(c.command_name) as boolean) : undefined;
          const newEnabled = !!c.enabled;
          if (oldEnabled !== undefined && oldEnabled === newEnabled) continue;
          await SystemLogger.log({
            guildId,
            userId: auth.user.id,
            userName: String(auth.user.name || auth.user.username || 'Unknown User'),
            userEmail: auth.user.email || undefined,
            userRole: auth.user.role || 'viewer',
            actionType: 'command_toggle',
            actionName: newEnabled ? 'enable_command' : 'disable_command',
            targetType: 'command',
            targetId: c.command_name,
            targetName: c.command_name,
            oldValue: { enabled: oldEnabled },
            newValue: { enabled: newEnabled },
            metadata: { source },
            status: 'success'
          });
        }
      } catch {}

      return NextResponse.json(data);
    }

    // Fallback: Update database directly when bot server is not available
    try {
      const commands = cmds;
      if (!Array.isArray(commands)) {
        return NextResponse.json(
          { error: 'Commands must be an array' },
          { status: 400 }
        );
      }

      // Update each command in the database
      for (const cmd of commands) {
        await query(
          `INSERT INTO guild_commands (guild_id, command_name, enabled, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
           enabled = VALUES(enabled), 
           updated_at = NOW()`,
          [guildId, cmd.command_name, cmd.enabled ? 1 : 0]
        );
      }

      // Log only changed commands
      try {
        const source = (request.headers.get('referer') || '').includes('/admin/') ? 'admin' : 'guild';
        for (const c of commands) {
          const oldEnabled = currentMap.has(c.command_name) ? (currentMap.get(c.command_name) as boolean) : undefined;
          const newEnabled = !!c.enabled;
          if (oldEnabled !== undefined && oldEnabled === newEnabled) continue;
          await SystemLogger.log({
            guildId,
            userId: auth.user.id,
            userName: String(auth.user.name || auth.user.username || 'Unknown User'),
            userEmail: auth.user.email || undefined,
            userRole: auth.user.role || 'viewer',
            actionType: 'command_toggle',
            actionName: newEnabled ? 'enable_command' : 'disable_command',
            targetType: 'command',
            targetId: c.command_name,
            targetName: c.command_name,
            oldValue: { enabled: oldEnabled },
            newValue: { enabled: newEnabled },
            metadata: { source },
            status: 'success'
          });
        }
      } catch {}

      return NextResponse.json({ 
        success: true, 
        message: `Updated ${commands.length} commands (fallback mode - bot server not available)`,
        fallback: true
      });
    } catch (fallbackError: any) {
      return NextResponse.json(
        { error: 'Internal server error', details: fallbackError?.message || 'unknown' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'unknown' },
      { status: 500 }
    );
  }
}
