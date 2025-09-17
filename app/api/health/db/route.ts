import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { query } from "@/lib/db";

export async function GET() {
	try {
		if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
			return NextResponse.json({ ok: false, error: "Database not configured", details: { DB_HOST: !!env.DB_HOST, DB_USER: !!env.DB_USER, DB_NAME: !!env.DB_NAME } }, { status: 500 });
		}
		
		const rows = await query("SELECT 1 AS ok");
		return NextResponse.json({ ok: true, result: rows });
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e?.message || String(e), code: e?.code }, { status: 500 });
	}
}

