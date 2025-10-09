import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET bot customization
export const GET = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  
  try {
    const [rows] = await query(
      'SELECT bot_name FROM bot_customization WHERE guild_id = ? LIMIT 1',
      [guildId]
    ) as any[];

    if (rows) {
      return NextResponse.json({ 
        customization: {
          bot_name: rows.bot_name || '',
        }
      });
    } else {
      // Return empty config if none exists
      return NextResponse.json({ 
        customization: {
          bot_name: '',
        }
      });
    }
  } catch (error) {
    console.error('Error fetching bot customization:', error);
    return NextResponse.json({ error: 'Failed to fetch customization' }, { status: 500 });
  }
};

// PUT update bot customization
export const PUT = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const body = await req.json();
  const { bot_name } = body;

  try {
    // Check if customization exists
    const [existing] = await query(
      'SELECT guild_id FROM bot_customization WHERE guild_id = ? LIMIT 1',
      [guildId]
    ) as any[];

    if (existing) {
      // Update existing customization
      await query(
        `UPDATE bot_customization 
         SET bot_name = ?, updated_at = NOW()
         WHERE guild_id = ?`,
        [bot_name || null, guildId]
      );
    } else {
      // Insert new customization
      await query(
        `INSERT INTO bot_customization (guild_id, bot_name, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [guildId, bot_name || null]
      );
    }

    console.log(`[BOT-CUSTOMIZATION] Updated customization for guild ${guildId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating bot customization:', error);
    return NextResponse.json({ error: 'Failed to update customization' }, { status: 500 });
  }
};

// DELETE reset bot customization
export const DELETE = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  
  try {
    await query('DELETE FROM bot_customization WHERE guild_id = ?', [guildId]);
    console.log(`[BOT-CUSTOMIZATION] Reset customization for guild ${guildId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot customization:', error);
    return NextResponse.json({ error: 'Failed to reset customization' }, { status: 500 });
  }
};
