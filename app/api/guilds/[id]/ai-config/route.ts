import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET AI config
export const GET = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  
  try {
    const [rows] = await query(
      'SELECT * FROM guild_ai_config WHERE guild_id = ? LIMIT 1',
      [guildId]
    ) as any[];

    if (rows) {
      return NextResponse.json({ 
        config: {
          enabled: Boolean(rows.enabled),
          model: rows.model || 'gpt-4o-mini',
          max_tokens: rows.max_tokens || 500,
          temperature: rows.temperature || 0.7,
          system_prompt: rows.system_prompt || '',
        }
      });
    } else {
      // Return default config if none exists
      return NextResponse.json({ 
        config: {
          enabled: false,
          model: 'gpt-4o-mini',
          max_tokens: 500,
          temperature: 0.7,
          system_prompt: '',
        }
      });
    }
  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
};

// PUT update AI config
export const PUT = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const body = await req.json();
  const { enabled, model, max_tokens, temperature, system_prompt } = body;

  try {
    // Check if config exists
    const [existing] = await query(
      'SELECT guild_id FROM guild_ai_config WHERE guild_id = ? LIMIT 1',
      [guildId]
    ) as any[];

    if (existing) {
      // Update existing config
      await query(
        `UPDATE guild_ai_config 
         SET enabled = ?, model = ?, max_tokens = ?, temperature = ?, system_prompt = ?, updated_at = NOW()
         WHERE guild_id = ?`,
        [enabled ? 1 : 0, model, max_tokens, temperature, system_prompt || null, guildId]
      );
    } else {
      // Insert new config
      await query(
        `INSERT INTO guild_ai_config (guild_id, enabled, model, max_tokens, temperature, system_prompt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [guildId, enabled ? 1 : 0, model, max_tokens, temperature, system_prompt || null]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AI config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
};

// PATCH update only custom prompt (user-editable)
export const PATCH = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const body = await req.json();
  const { system_prompt } = body;

  try {
    // Check if config exists
    const [existing] = await query(
      'SELECT guild_id FROM guild_ai_config WHERE guild_id = ? LIMIT 1',
      [guildId]
    ) as any[];

    if (existing) {
      // Update only the system prompt
      await query(
        `UPDATE guild_ai_config 
         SET system_prompt = ?, updated_at = NOW()
         WHERE guild_id = ?`,
        [system_prompt || null, guildId]
      );
    } else {
      // If no config exists, create one with default settings
      await query(
        `INSERT INTO guild_ai_config (guild_id, enabled, model, max_tokens, temperature, system_prompt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [guildId, 0, 'gpt-4o-mini', 500, 0.7, system_prompt || null]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AI custom prompt:', error);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
};

