import { NextResponse } from "next/server";
import { authMiddleware, createAuthResponse } from "@/lib/auth-middleware";
import { query } from "@/lib/db";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET role permissions for AI summarization
export const GET = async (_req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(_req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  
  try {
    const rows = await query(
      `SELECT role_id, allowed FROM feature_role_permissions 
       WHERE guild_id = ? AND feature_key = ?`,
      [guildId, 'ai_summarization']
    ) as any[];

    return NextResponse.json({ 
      permissions: rows.map((row: any) => ({
        role_id: row.role_id,
        allowed: Boolean(row.allowed),
      }))
    });
  } catch (error) {
    console.error('Error fetching AI permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
};

// PUT update role permission
export const PUT = async (req: any, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await authMiddleware(req as any);
  if (auth.error || !auth.user) {
    return createAuthResponse(auth.error || 'Unauthorized');
  }

  const { id: guildId } = await params;
  const body = await req.json();
  const { role_id, allowed } = body;

  if (!role_id) {
    return NextResponse.json({ error: 'role_id is required' }, { status: 400 });
  }

  try {
    // Check if permission exists
    const [existing] = await query(
      `SELECT id FROM feature_role_permissions 
       WHERE guild_id = ? AND feature_key = ? AND role_id = ? LIMIT 1`,
      [guildId, 'ai_summarization', role_id]
    ) as any[];

    if (existing) {
      if (allowed) {
        // Update existing permission
        await query(
          `UPDATE feature_role_permissions 
           SET allowed = ? 
           WHERE guild_id = ? AND feature_key = ? AND role_id = ?`,
          [1, guildId, 'ai_summarization', role_id]
        );
      } else {
        // Delete permission if setting to false
        await query(
          `DELETE FROM feature_role_permissions 
           WHERE guild_id = ? AND feature_key = ? AND role_id = ?`,
          [guildId, 'ai_summarization', role_id]
        );
      }
    } else if (allowed) {
      // Insert new permission only if allowed is true
      await query(
        `INSERT INTO feature_role_permissions (guild_id, feature_key, role_id, allowed)
         VALUES (?, ?, ?, ?)`,
        [guildId, 'ai_summarization', role_id, 1]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating AI permission:', error);
    return NextResponse.json({ error: 'Failed to update permission' }, { status: 500 });
  }
};


