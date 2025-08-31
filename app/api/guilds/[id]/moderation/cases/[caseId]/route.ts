import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Database connection helper for Discord bot database
async function query(sql: string, params: any[] = []) {
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.APP_DB_HOST || process.env.BOT_DB_HOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.APP_DB_USER || process.env.BOT_DB_USER || process.env.DB_USER || 'root',
    password: process.env.APP_DB_PASSWORD || process.env.BOT_DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.APP_DB_NAME || process.env.BOT_DB_NAME || 'chester_bot',
    port: Number(process.env.APP_DB_PORT || process.env.BOT_DB_PORT || process.env.DB_PORT || 3306),
  });

  try {
    // Handle parameters properly
    if (!params || params.length === 0) {
      const [rows] = await connection.query(sql);
      return rows;
    }

    const [rows] = await connection.query(sql, params);
    return rows;
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: guildId, caseId } = await params;

    // Get case details
    const caseQuery = `
      SELECT mc.*, COUNT(me.id) as evidence_count
      FROM moderation_cases mc
      LEFT JOIN moderation_evidence me ON mc.id = me.case_id AND mc.guild_id = me.guild_id
      WHERE mc.guild_id = ? AND mc.case_id = ?
      GROUP BY mc.id
    `;

    const caseResult = await query(caseQuery, [guildId, caseId]);

    if (!Array.isArray(caseResult) || caseResult.length === 0) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Get evidence for this case using the integer case ID
    const evidenceQuery = `
      SELECT *
      FROM moderation_evidence
      WHERE guild_id = ? AND case_id = ?
      ORDER BY uploaded_at ASC
    `;

    const evidence = await query(evidenceQuery, [guildId, caseData.id]);

    return NextResponse.json({
      case: caseData,
      evidence
    });

  } catch (error) {
    console.error('Error fetching case details:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: guildId, caseId } = await params;
    const body = await request.json();

    const { active, reason } = body;

    // Update case
    const updateQuery = `
      UPDATE moderation_cases
      SET active = ?, reason = COALESCE(?, reason), updated_at = NOW()
      WHERE guild_id = ? AND case_id = ?
    `;

    await query(updateQuery, [active, reason, guildId, caseId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: guildId, caseId } = await params;

    // Delete case and associated evidence
    await query('DELETE FROM moderation_evidence WHERE guild_id = ? AND case_id = ?', [guildId, caseId]);
    await query('DELETE FROM moderation_cases WHERE guild_id = ? AND case_id = ?', [guildId, caseId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
