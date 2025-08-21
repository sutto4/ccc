import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz";
import { query } from "@/lib/db";

// GET list
export const GET = withAuth(async (_req, { params }: { params: { id: string } }) => {
  const guildId = params.id;
  const rows = await query(
    `SELECT id, guild_id, platform, creator, role_id, channel_id, discord_user_id, notes, enabled
     FROM creator_alert_rules WHERE guild_id = ? ORDER BY id DESC`,
    [guildId]
  );
  return NextResponse.json({ rules: rows });
});

// POST create
export const POST = withAuth(async (req, { params }: { params: { id: string } }) => {
  const guildId = params.id;
  const body = await req.json();
  const { platform, creator, roleId, channelId, discordUserId, notes, enabled } = body || {};
  if (!platform || !creator || !roleId || !channelId) {
    return NextResponse.json({ error: "platform, creator, roleId, channelId required" }, { status: 400 });
  }
  const result = await query(
    `INSERT INTO creator_alert_rules (guild_id, platform, creator, role_id, channel_id, discord_user_id, notes, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [guildId, platform, creator, roleId, channelId, discordUserId || null, notes || null, enabled ? 1 : 0]
  );
  return NextResponse.json({ id: (result as any).insertId });
});

// PUT update
export const PUT = withAuth(async (req, { params }: { params: { id: string } }) => {
  const guildId = params.id;
  const body = await req.json();
  const { id, platform, creator, roleId, channelId, discordUserId, notes, enabled } = body || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await query(
    `UPDATE creator_alert_rules
     SET platform = COALESCE(?, platform),
         creator = COALESCE(?, creator),
         role_id = COALESCE(?, role_id),
         channel_id = COALESCE(?, channel_id),
         discord_user_id = COALESCE(?, discord_user_id),
         notes = COALESCE(?, notes),
         enabled = COALESCE(?, enabled)
     WHERE id = ? AND guild_id = ?`,
    [platform, creator, roleId, channelId, discordUserId, notes, typeof enabled === "boolean" ? (enabled ? 1 : 0) : null, id, guildId]
  );
  return NextResponse.json({ ok: true });
});

// DELETE remove
export const DELETE = withAuth(async (req, { params }: { params: { id: string } }) => {
  const guildId = params.id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await query(`DELETE FROM creator_alert_rules WHERE id = ? AND guild_id = ?`, [id, guildId]);
  return NextResponse.json({ ok: true });
});


