import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUT update single alert
export const PUT = async (req: any, { params }: { params: Promise<{ id: string; alertId: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId, alertId } = await params;
  const body = await req.json();
  const { platform, channelOrUser, roleId, mentionRoleIds, channelId, discordUserId, customMessage, notes, enabled } = body || {};
  
  // Convert mentionRoleIds array to JSON string
  const mentionRoleIdsJson = mentionRoleIds && mentionRoleIds.length > 0 ? JSON.stringify(mentionRoleIds) : null;
  
  await query(
    `UPDATE creator_alert_rules
     SET platform = COALESCE(?, platform),
         creator = COALESCE(?, creator),
         role_id = ?,
         channel_id = COALESCE(?, channel_id),
         discord_user_id = ?,
         mention_role_ids = ?,
         custom_message = ?,
         notes = ?,
         enabled = ?
     WHERE id = ? AND guild_id = ?`,
    [
      platform || null,
      channelOrUser || null,
      roleId || null,
      channelId || null,
      discordUserId || null,
      mentionRoleIdsJson,
      customMessage || null,
      notes || null,
      enabled ? 1 : 0,
      parseInt(alertId),
      guildId
    ]
  );
  
  // Get updated rule
  const [rule] = await query(
    `SELECT id, guild_id, platform, creator as channelOrUser, role_id as roleId, channel_id as channelId, 
            discord_user_id as discordUserId, mention_role_ids as mentionRoleIds, custom_message as customMessage, notes, enabled
     FROM creator_alert_rules 
     WHERE id = ? AND guild_id = ?`,
    [parseInt(alertId), guildId]
  ) as any[];
  
  return NextResponse.json({ 
    rule: { 
      ...rule, 
      enabled: Boolean(rule?.enabled),
      mentionRoleIds: rule?.mentionRoleIds ? JSON.parse(rule.mentionRoleIds) : []
    } 
  });
};

// DELETE remove single alert
export const DELETE = async (_req: any, { params }: { params: Promise<{ id: string; alertId: string }> }) => {
  // Check authentication
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId, alertId } = await params;
  
  // Get the creator name before deleting the rule
  const [rule] = await query(
    `SELECT creator FROM creator_alert_rules WHERE id = ? AND guild_id = ?`,
    [parseInt(alertId), guildId]
  ) as any[];
  
  if (rule) {
    // Delete the rule
    await query(`DELETE FROM creator_alert_rules WHERE id = ? AND guild_id = ?`, [parseInt(alertId), guildId]);
    
    // Clear the cache for this creator
    await query(
      `DELETE FROM creator_alert_cache WHERE cache_key LIKE ?`,
      [`creator_alert_${guildId}_%`]
    );
    
    console.log(`[CREATOR-ALERTS] Deleted rule ${alertId} for creator ${rule.creator} and cleared cache`);
  }
  
  return NextResponse.json({ ok: true });
};

