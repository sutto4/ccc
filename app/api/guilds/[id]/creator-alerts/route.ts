import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET list
export const GET = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const rows = await query(
    `SELECT id, guild_id, platform, creator as channelOrUser, role_id as roleId, channel_id as channelId, 
            discord_user_id as discordUserId, mention_role_ids as mentionRoleIds, custom_message as customMessage, notes, enabled
     FROM creator_alert_rules WHERE guild_id = ? ORDER BY id DESC`,
    [guildId]
  ) as any[];
  
  // Convert enabled to boolean and parse mentionRoleIds JSON
  const rules = rows.map(rule => ({ 
    ...rule, 
    enabled: Boolean(rule.enabled),
    mentionRoleIds: rule.mentionRoleIds ? JSON.parse(rule.mentionRoleIds) : []
  }));
  
  return NextResponse.json({ rules });
};

// POST create
export const POST = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const body = await req.json();
  const { platform, channelOrUser, roleId, mentionRoleIds, channelId, discordUserId, customMessage, notes, enabled } = body || {};
  if (!platform || !channelOrUser || !channelId) {
    return NextResponse.json({ error: "platform, channelOrUser, channelId required" }, { status: 400 });
  }
  
  // Convert mentionRoleIds array to JSON string
  const mentionRoleIdsJson = mentionRoleIds && mentionRoleIds.length > 0 ? JSON.stringify(mentionRoleIds) : null;
  
  const result = await query(
    `INSERT INTO creator_alert_rules (guild_id, platform, creator, role_id, channel_id, discord_user_id, mention_role_ids, custom_message, notes, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [guildId, platform, channelOrUser, (roleId && roleId.trim()) ? roleId : null, channelId, discordUserId || null, mentionRoleIdsJson, customMessage || null, notes || null, enabled ? 1 : 0]
  ) as any;
  
  const insertId = result.insertId;
  
  // Fetch the created rule
  const [rule] = await query(
    `SELECT id, guild_id, platform, creator as channelOrUser, role_id as roleId, channel_id as channelId, 
            discord_user_id as discordUserId, mention_role_ids as mentionRoleIds, custom_message as customMessage, notes, enabled
     FROM creator_alert_rules 
     WHERE id = ? AND guild_id = ?`,
    [insertId, guildId]
  ) as any[];
  
  return NextResponse.json({ 
    rule: { 
      ...rule, 
      enabled: Boolean(rule?.enabled),
      mentionRoleIds: rule?.mentionRoleIds ? JSON.parse(rule.mentionRoleIds) : []
    } 
  });
};

// PUT update
export const PUT = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const body = await req.json();
  const { id, platform, creator, roleId, channelId, discordUserId, customMessage, notes, enabled } = body || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  
  // Convert undefined values to null for database
  const safePlatform = platform !== undefined ? platform : null;
  const safeCreator = creator !== undefined ? creator : null;
  const safeRoleId = roleId !== undefined ? roleId : null;
  const safeChannelId = channelId !== undefined ? channelId : null;
  const safeDiscordUserId = discordUserId !== undefined ? discordUserId : null;
  const safeCustomMessage = customMessage !== undefined ? customMessage : null;
  const safeNotes = notes !== undefined ? notes : null;
  const safeEnabled = enabled !== undefined ? (enabled ? 1 : 0) : null;
  
  await query(
    `UPDATE creator_alert_rules
     SET platform = COALESCE(?, platform),
         creator = COALESCE(?, creator),
         role_id = COALESCE(?, role_id),
         channel_id = COALESCE(?, channel_id),
         discord_user_id = COALESCE(?, discord_user_id),
         custom_message = COALESCE(?, custom_message),
         notes = COALESCE(?, notes),
         enabled = COALESCE(?, enabled)
     WHERE id = ? AND guild_id = ?`,
    [safePlatform, safeCreator, safeRoleId, safeChannelId, safeDiscordUserId, safeCustomMessage, safeNotes, safeEnabled, parseInt(id), guildId]
  );
  return NextResponse.json({ ok: true });
};

// DELETE remove
export const DELETE = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  
  // Get the creator name before deleting the rule
  const [rule] = await query(
    `SELECT creator FROM creator_alert_rules WHERE id = ? AND guild_id = ?`,
    [parseInt(id), guildId]
  );
  
  if (rule) {
    // Delete the rule
    await query(`DELETE FROM creator_alert_rules WHERE id = ? AND guild_id = ?`, [parseInt(id), guildId]);
    
    // Clear the cache for this creator
    await query(
      `DELETE FROM creator_alert_cache WHERE cache_key LIKE ?`,
      [`creator_alert_${guildId}_%`]
    );
    
    console.log(`[CREATOR-ALERTS] Deleted rule ${id} for creator ${rule.creator} and cleared cache`);
  }
  
  return NextResponse.json({ ok: true });
};


