// api.ts
import type { ExternalGroup, GuildMember, GuildRole } from "./types";

const isServer = typeof window === "undefined";

// Server talks straight to the bot (no Nginx in-between).
// Browser uses Nginx proxy at /api (or override with NEXT_PUBLIC_API_BASE_URL).
const clientBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/+$/, "");
const API_BASE = isServer ? "http://127.0.0.1:3001" : clientBase;

async function fetchJson<T>(path: string, init?: RequestInit) {
	const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
	const res = await fetch(url, { cache: "no-store", ...init });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} :: ${text.slice(0,200)}`);
	}
	return res.json() as Promise<T>;
}

export async function fetchRoles(guildId: string): Promise<GuildRole[]> {
	return fetchJson<GuildRole[]>(`/guilds/${guildId}/roles`);
}

export async function fetchMembers(
	guildId: string,
	params: { q?: string; role?: string[]; group?: string[] }
): Promise<GuildMember[]> {
	const usp = new URLSearchParams();
	if (params.q) usp.set("q", params.q);
	if (params.role?.length) usp.set("role", params.role.join(","));
	if (params.group?.length) usp.set("group", params.group.join(","));
	return fetchJson<GuildMember[]>(`/guilds/${guildId}/members?${usp.toString()}`);
}

export async function fetchExternalGroups(): Promise<ExternalGroup[]> {
	return fetchJson<ExternalGroup[]>(`/external/groups`);
}

// Optional: export for quick debugging elsewhere
export { API_BASE };
