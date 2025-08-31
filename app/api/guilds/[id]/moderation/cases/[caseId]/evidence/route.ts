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

    // First, get the integer case ID from moderation_cases table
    const caseQuery = `
      SELECT id FROM moderation_cases 
      WHERE guild_id = ? AND case_id = ?
    `;
    
    const caseResult = await query(caseQuery, [guildId, caseId]);
    if (!caseResult || caseResult.length === 0) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    const integerCaseId = caseResult[0].id;

    const evidenceQuery = `
      SELECT *
      FROM moderation_evidence
      WHERE guild_id = ? AND case_id = ?
      ORDER BY uploaded_at ASC
    `;

    const evidence = await query(evidenceQuery, [guildId, integerCaseId]);

    return NextResponse.json({ evidence });

  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; caseId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: guildId, caseId } = await params;
    const body = await request.json();

    const {
      evidence_type,
      content,
      uploaded_by,
      uploaded_by_id
    } = body;

    // Validate required fields
    if (!evidence_type || !content || !uploaded_by) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate evidence type
    const validTypes = ['text', 'image', 'link', 'file', 'video'];
    if (!validTypes.includes(evidence_type)) {
      return NextResponse.json({ error: "Invalid evidence type" }, { status: 400 });
    }

    // First, get the integer case ID from moderation_cases table
    const caseQuery = `
      SELECT id FROM moderation_cases 
      WHERE guild_id = ? AND case_id = ?
    `;
    
    const caseResult = await query(caseQuery, [guildId, caseId]);
    if (!caseResult || caseResult.length === 0) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    
    const integerCaseId = caseResult[0].id;

    // Insert evidence using the integer case ID
    const insertQuery = `
      INSERT INTO moderation_evidence (
        case_id, guild_id, evidence_type, content, uploaded_by, uploaded_by_id, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await query(insertQuery, [integerCaseId, guildId, evidence_type, content, uploaded_by, uploaded_by_id || uploaded_by]);

    return NextResponse.json({
      success: true,
      id: (result as any).insertId
    });

  } catch (error) {
    console.error('Error adding evidence:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
