import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
	const startedAt = new Date().toISOString();
	console.log('🚨🚨🚨 HEALTH CHECK ENDPOINT CALLED 🚨🚨🚨');
	console.log('Timestamp:', startedAt);
	console.log('Environment:', process.env.NODE_ENV);
	console.log('Process PID:', process.pid);
	console.log('Node version:', process.version);
	console.log('Platform:', process.platform);
	console.log('Architecture:', process.arch);
	console.log('Uptime:', process.uptime(), 'seconds');
	console.log('Memory usage:', process.memoryUsage());

	// DB health
	let dbOk = false as boolean;
	let dbError: string | undefined;
	try {
		let mysql: any;
		({ default: mysql } = await import("mysql2/promise"));
		const connection = await mysql.createConnection({
			host: env.DB_HOST,
			user: env.DB_USER,
			password: env.DB_PASS,
			database: env.DB_NAME,
		});
		await connection.query("SELECT 1 AS ok");
		await connection.end();
		dbOk = true;
	} catch (e: any) {
		dbOk = false;
		dbError = e?.message || String(e);
	}

	// Bot API health
	const base = env.SERVER_API_BASE_URL || "";
	let botOk = false as boolean;
	let botStatus: number | undefined;
	let botError: string | undefined;
	if (base) {
		const url = `${base.replace(/\/$/, "")}/api/guilds`;
		console.log('[HEALTH] Testing bot API connection to:', url);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000); // Increased timeout
		try {
			const res = await fetch(url, { signal: controller.signal });
			botStatus = res.status;
			botOk = res.ok;
			console.log('[HEALTH] Bot API response:', { status: botStatus, ok: botOk });
		} catch (e: any) {
			botOk = false;
			botError = e?.message || String(e);
			console.log('[HEALTH] Bot API error:', botError);
		} finally {
			clearTimeout(timeout);
		}
	} else {
		botError = "SERVER_API_BASE_URL not configured";
		console.log('[HEALTH] SERVER_API_BASE_URL not configured');
	}

	// Additional debug info
	console.log('Environment variables check:');
	console.log('- SERVER_API_BASE_URL:', env.SERVER_API_BASE_URL ? 'SET' : 'NOT SET');
	console.log('- DB_HOST:', env.DB_HOST ? 'SET' : 'NOT SET');
	console.log('- DB_USER:', env.DB_USER ? 'SET' : 'NOT SET');
	console.log('- DB_NAME:', env.DB_NAME ? 'SET' : 'NOT SET');
	console.log('- NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');
	console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? 'SET' : 'NOT SET');

	const ok = dbOk && botOk;
	return NextResponse.json({
		ok,
		time: startedAt,
		env: {
			SERVER_API_BASE_URL: Boolean(env.SERVER_API_BASE_URL),
			DB_HOST: Boolean(env.DB_HOST),
			DB_USER: Boolean(env.DB_USER),
			DB_NAME: Boolean(env.DB_NAME),
		},
		db: { ok: dbOk, error: dbError },
		botApi: { ok: botOk, status: botStatus, error: botError },
	});
}

