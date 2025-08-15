import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const readLimiter = createRateLimiter(60, 60_000);
const writeLimiter = createRateLimiter(20, 60_000);

// In-memory fallback store for local dev (non-persistent)
type Mapping = { emoji: string; roleId: string; emoji_id?: string | null };
type ReactionRoleConfig = { channelId: string; messageId: string; mappings: Mapping[] };
const store = new Map<string, Map<string, ReactionRoleConfig>>(); // guildId -> messageId -> config

function isValidSnowflake(id: string) {
	return /^[0-9]{5,20}$/.test(id);
}

async function getMysql() {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mod = await import("mysql2/promise");
		return mod.default as any;
	} catch (e) {
		return null;
	}
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id: guildId } = await params;
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = readLimiter.check(`rl:rr:list:${ip}:${guildId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
	if (!isValidSnowflake(guildId)) return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });

	// Prefer DB if configured
	if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
		const mysql = await getMysql();
		if (!mysql) return NextResponse.json({ error: "Database driver not installed. Run: pnpm add mysql2" }, { status: 500 });
		try {
			const conn = await mysql.createConnection({
				host: env.DB_HOST,
				user: env.DB_USER,
				password: env.DB_PASS,
				database: env.DB_NAME,
			});
			const [messages] = await conn.execute(
				`SELECT id, channel_id, message_id FROM reaction_role_messages WHERE guild_id = ?`,
				[guildId]
			);
			const msgRows = Array.isArray(messages) ? (messages as any[]) : [];
			let configs: ReactionRoleConfig[] = [];
			if (msgRows.length > 0) {
				const ids = msgRows.map(r => r.id);
				const [maps] = await conn.query(
					`SELECT reaction_role_message_id, emoji, emoji_id, role_id FROM reaction_role_mappings WHERE reaction_role_message_id IN (${ids.map(() => '?').join(',')})`,
					ids
				);
				const mapRows = Array.isArray(maps) ? (maps as any[]) : [];
				const idToMappings = new Map<number, Mapping[]>();
				for (const m of mapRows) {
					const arr = idToMappings.get(m.reaction_role_message_id) || [];
					arr.push({ emoji: m.emoji ?? '', emoji_id: m.emoji_id ?? null, roleId: String(m.role_id) });
					idToMappings.set(m.reaction_role_message_id, arr);
				}
				configs = msgRows.map(r => ({
					channelId: String(r.channel_id),
					messageId: String(r.message_id),
					mappings: idToMappings.get(r.id) || [],
				}));
			}
			await conn.end();
			return NextResponse.json({ configs });
		} catch (e: any) {
			return NextResponse.json({ error: e?.message || "DB error" }, { status: 500 });
		}
	}

	// Else proxy to bot if configured
	const base = env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
	if (base) {
		try {
			const res = await fetch(`${base}/guilds/${guildId}/reaction-roles`, { cache: "no-store" });
			const text = await res.text();
			if (!res.ok) return NextResponse.json({ error: text || `Upstream error ${res.status}` }, { status: res.status });
			try { return NextResponse.json(JSON.parse(text)); } catch { return NextResponse.json({ ok: true }); }
		} catch (e: any) {
			return NextResponse.json({ error: e?.message || "Proxy failed" }, { status: 502 });
		}
	}

	// Local memory fallback
	const guildMap = store.get(guildId);
	const list = guildMap ? Array.from(guildMap.values()) : [];
	return NextResponse.json({ configs: list });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id: guildId } = await params;
	const ip = (req.headers as any).get?.("x-forwarded-for") || "0.0.0.0";
	const rl = writeLimiter.check(`rl:rr:save:${ip}:${guildId}`);
	if (!rl.allowed) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });

	if (!isValidSnowflake(guildId)) return NextResponse.json({ error: "Invalid guild id" }, { status: 400 });
	let body: any;
	try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
	const { channelId, messageId, mappings } = body || {};
	if (!isValidSnowflake(channelId)) return NextResponse.json({ error: "Invalid channel id" }, { status: 400 });
	if (!isValidSnowflake(messageId)) return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
	if (!Array.isArray(mappings) || mappings.length === 0) return NextResponse.json({ error: "Mappings required" }, { status: 400 });
	for (const m of mappings) {
		if (!m || typeof m.emoji !== 'string' || m.emoji.length === 0) return NextResponse.json({ error: "Invalid emoji in mappings" }, { status: 400 });
		if (typeof m.roleId !== 'string' || !isValidSnowflake(m.roleId)) return NextResponse.json({ error: "Invalid roleId in mappings" }, { status: 400 });
	}

	// If DB configured, persist there
	if (env.DB_HOST && env.DB_USER && env.DB_NAME) {
		const mysql = await getMysql();
		if (!mysql) return NextResponse.json({ error: "Database driver not installed. Run: pnpm add mysql2" }, { status: 500 });
		const conn = await mysql.createConnection({
			host: env.DB_HOST,
			user: env.DB_USER,
			password: env.DB_PASS,
			database: env.DB_NAME,
		});
		try {
			await conn.beginTransaction();
			// Upsert message
			await conn.execute(
				`INSERT INTO reaction_role_messages (guild_id, channel_id, message_id)
				 VALUES (?, ?, ?)
				 ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), updated_at = CURRENT_TIMESTAMP`,
				[guildId, channelId, messageId]
			);
			// Get id
			const [rows] = await conn.execute(
				`SELECT id FROM reaction_role_messages WHERE guild_id = ? AND message_id = ? LIMIT 1`,
				[guildId, messageId]
			);
			const msg = Array.isArray(rows) && rows.length > 0 ? (rows as any[])[0] : null;
			if (!msg) throw new Error("Failed to upsert reaction role message");

			// Replace mappings
			await conn.execute(`DELETE FROM reaction_role_mappings WHERE reaction_role_message_id = ?`, [msg.id]);
			if (mappings.length > 0) {
				const values: any[] = [];
				const placeholders: string[] = [];
				for (const m of mappings) {
					placeholders.push('(?, ?, ?, ?)');
					values.push(msg.id, m.emoji || null, m.emoji_id || null, m.roleId);
				}
				await conn.execute(
					`INSERT INTO reaction_role_mappings (reaction_role_message_id, emoji, emoji_id, role_id) VALUES ${placeholders.join(',')}`,
					values
				);
			}
			await conn.commit();
			await conn.end();
			return NextResponse.json({ ok: true });
		} catch (e: any) {
			try { await conn.rollback(); } catch {}
			try { await conn.end(); } catch {}
			return NextResponse.json({ error: e?.message || "DB error" }, { status: 500 });
		}
	}

	// Else proxy to bot if configured
	const base = env.SERVER_API_BASE_URL?.replace(/\/+$/, "");
	if (base) {
		try {
			const res = await fetch(`${base}/guilds/${guildId}/reaction-roles`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ channelId, messageId, mappings }),
			});
			const text = await res.text();
			if (!res.ok) return NextResponse.json({ error: text || `Upstream error ${res.status}` }, { status: res.status });
			try { return NextResponse.json(JSON.parse(text)); } catch { return NextResponse.json({ ok: true }); }
		} catch (e: any) {
			return NextResponse.json({ error: e?.message || "Proxy failed" }, { status: 502 });
		}
	}

	// Local dev fallback
	let guildMap = store.get(guildId);
	if (!guildMap) { guildMap = new Map(); store.set(guildId, guildMap); }
	const config: ReactionRoleConfig = { channelId, messageId, mappings };
	guildMap.set(messageId, config);
	return NextResponse.json({ ok: true, config });
}
