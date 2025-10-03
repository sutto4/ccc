import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, createAuthResponse } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guildId = (await params).id;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if guild exists
    const guildRows = await query(
      'SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1',
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    // Get AI configuration
    const configRows = await query(
      'SELECT * FROM guild_ai_config WHERE guild_id = ? LIMIT 1',
      [guildId]
    );

    if (!Array.isArray(configRows) || configRows.length === 0) {
      // Return default configuration
      return NextResponse.json({
        enabled: false,
        model: 'gpt-3.5-turbo',
        max_tokens_per_request: 1000,
        max_messages_per_summary: 50,
        custom_prompt: null,
        rate_limit_per_hour: 10,
        rate_limit_per_day: 100
      });
    }

    const config = configRows[0] as any;
    return NextResponse.json({
      enabled: config.enabled,
      model: config.model,
      max_tokens_per_request: config.max_tokens_per_request,
      max_messages_per_summary: config.max_messages_per_summary,
      custom_prompt: config.custom_prompt,
      rate_limit_per_hour: config.rate_limit_per_hour,
      rate_limit_per_day: config.rate_limit_per_day
    });

  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await authMiddleware(request as any);
    if (auth.error || !auth.user) {
      return createAuthResponse(auth.error || 'Unauthorized');
    }

    const guildId = (await params).id;
    if (!guildId) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 });
    }

    // Check if guild exists
    const guildRows = await query(
      'SELECT guild_id FROM guilds WHERE guild_id = ? LIMIT 1',
      [guildId]
    );

    if (!Array.isArray(guildRows) || guildRows.length === 0) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      enabled,
      model,
      max_tokens_per_request,
      max_messages_per_summary,
      custom_prompt,
      rate_limit_per_hour,
      rate_limit_per_day
    } = body;

    // Validate input
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    if (model && !['gpt-3.5-turbo', 'gpt-4'].includes(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    if (max_tokens_per_request && (max_tokens_per_request < 100 || max_tokens_per_request > 4000)) {
      return NextResponse.json({ error: 'max_tokens_per_request must be between 100 and 4000' }, { status: 400 });
    }

    if (max_messages_per_summary && (max_messages_per_summary < 1 || max_messages_per_summary > 100)) {
      return NextResponse.json({ error: 'max_messages_per_summary must be between 1 and 100' }, { status: 400 });
    }

    if (rate_limit_per_hour && (rate_limit_per_hour < 1 || rate_limit_per_hour > 100)) {
      return NextResponse.json({ error: 'rate_limit_per_hour must be between 1 and 100' }, { status: 400 });
    }

    if (rate_limit_per_day && (rate_limit_per_day < 1 || rate_limit_per_day > 1000)) {
      return NextResponse.json({ error: 'rate_limit_per_day must be between 1 and 1000' }, { status: 400 });
    }

    // Update or insert configuration
    await query(`
      INSERT INTO guild_ai_config (
        guild_id, enabled, model, max_tokens_per_request, max_messages_per_summary,
        custom_prompt, rate_limit_per_hour, rate_limit_per_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = COALESCE(?, enabled),
        model = COALESCE(?, model),
        max_tokens_per_request = COALESCE(?, max_tokens_per_request),
        max_messages_per_summary = COALESCE(?, max_messages_per_summary),
        custom_prompt = COALESCE(?, custom_prompt),
        rate_limit_per_hour = COALESCE(?, rate_limit_per_hour),
        rate_limit_per_day = COALESCE(?, rate_limit_per_day),
        updated_at = CURRENT_TIMESTAMP
    `, [
      guildId,
      enabled ?? false,
      model ?? 'gpt-3.5-turbo',
      max_tokens_per_request ?? 1000,
      max_messages_per_summary ?? 50,
      custom_prompt ?? null,
      rate_limit_per_hour ?? 10,
      rate_limit_per_day ?? 100,
      // ON DUPLICATE KEY UPDATE values
      enabled,
      model,
      max_tokens_per_request,
      max_messages_per_summary,
      custom_prompt,
      rate_limit_per_hour,
      rate_limit_per_day
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating AI config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
