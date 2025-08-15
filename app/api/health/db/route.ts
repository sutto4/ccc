import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
	try {
		if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) {
			return NextResponse.json({ ok: false, error: "Database not configured", details: { DB_HOST: !!env.DB_HOST, DB_USER: !!env.DB_USER, DB_NAME: !!env.DB_NAME } }, { status: 500 });
		}
		let mysql: any;
		try {
			({ default: mysql } = await import("mysql2/promise"));
		} catch (e: any) {
			return NextResponse.json({ ok: false, error: "Database driver not installed. Run: pnpm add mysql2" }, { status: 500 });
		}
		const connection = await mysql.createConnection({
			host: env.DB_HOST,
			user: env.DB_USER,
			password: env.DB_PASS,
			database: env.DB_NAME,
		});
		const [rows] = await connection.query("SELECT 1 AS ok");
		await connection.end();
		return NextResponse.json({ ok: true, result: rows });
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e?.message || String(e), code: e?.code }, { status: 500 });
	}
}

