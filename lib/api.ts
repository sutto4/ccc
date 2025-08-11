import type { ExternalGroup, GuildMember, GuildRole } from "./types";

const isServer = typeof window === "undefined";

// Server talks straight to the bot. Browser uses the Nginx proxy.
// You can still override client base via NEXT_PUBLIC_API_BASE_URL if you want.
const clientBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/+$/, "");
const API_BASE = isServer ? "http://127.0.0.1:3001" : clientBase;

async function fetchJson<T>(url: string) {
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`Fetch failed ${res.status} ${res.statusText} at ${url} :: ${text.slice(0,200)}`);
	}
	return res.json() as Promise<T>;
}

export async function fetchRoles(guildId: string): Promise<GuildRole[]> {
	const url = `${API_BASE}/guilds/${guildId}/roles`;
	return fetchJson<GuildRole[]>(url);
}

export async function fetchMembers(
	guildId: string,
	params: { q?: string; role?: string[]; group?: string[] },
): Promise<GuildMember[]> {
	const usp = new URLSearchParams();
	if (params.q) usp.set("q", params.q);
	if (params.role?.length) usp.set("role", params.role.join(","));
	if (params.group?.length) usp.set("group", params.group.join(","));
	const url = `${API_BASE}/guilds/${guildId}/members?${usp.toString()}`;
	return fetchJson<GuildMember[]>(url);
}

export async function fetchExternalGroups(): Promise<ExternalGroup[]> {
	const url = `${API_BASE}/external/groups`;
	return fetchJson<ExternalGroup[]>(url);
}
