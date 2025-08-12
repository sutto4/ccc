export async function updateRole(
	guildId: string,
	roleId: string,
	patch: { name?: string; color?: string; hoist?: boolean; mentionable?: boolean }
) {
	return fetchJson(`/guilds/${guildId}/roles/${roleId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch),
	});
}
// api.ts
import type { ExternalGroup, Guild, GuildMember, GuildRole } from "./types";

const isServer = typeof window === "undefined";

function stripTrailingSlash(url: string) {
	return url.replace(/\/+$/, "");
}
function ensureLeadingSlash(path: string) {
	return path.startsWith("/") ? path : `/${path}`;
}
function baseFromEnv(env: string | undefined, fallback: string) {
	return stripTrailingSlash(env ?? fallback);
}

// Browser goes via Nginx proxy at /api (or override with NEXT_PUBLIC_API_BASE_URL)
const clientBase = baseFromEnv(process.env.NEXT_PUBLIC_API_BASE_URL, "/api");

// Server should talk to the API with /api prefix baked in
// Fallback now includes /api so we never end up at /guilds again
const serverBase = baseFromEnv(
	process.env.SERVER_API_BASE_URL,
	"http://127.0.0.1:3001/api"
);

const API_BASE = isServer ? serverBase : clientBase;

// uncomment for sanity checks during SSR
// if (isServer) {
// 	console.log("SERVER_API_BASE_URL=", process.env.SERVER_API_BASE_URL);
// 	console.log("NEXT_PUBLIC_API_BASE_URL=", process.env.NEXT_PUBLIC_API_BASE_URL);
// 	console.log("API_BASE resolved to:", API_BASE);
// }

async function fetchJson<T>(path: string, init?: RequestInit) {
	const url = `${API_BASE}${ensureLeadingSlash(path)}`;
	const res = await fetch(url, { cache: "no-store", ...init });
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`HTTP ${res.status} ${res.statusText} @ ${url} :: ${text.slice(0, 200)}`
		);
	}
	return res.json() as Promise<T>;
}

export async function fetchGuilds(accessToken: string): Promise<Guild[]> {
	return fetchJson<Guild[]>(`/guilds`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
}

export async function fetchRoles(guildId: string): Promise<GuildRole[]> {
	return fetchJson<GuildRole[]>(`/guilds/${guildId}/roles`);
}

export async function fetchMembers(
	guildId: string,
	params: { q?: string; role?: string[]; group?: string[] } = {}
): Promise<GuildMember[]> {
	const usp = new URLSearchParams();
	if (params.q) usp.set("q", params.q);
	if (params.role?.length) usp.set("role", params.role.join(","));
	if (params.group?.length) usp.set("group", params.group.join(","));
	const qs = usp.toString();
	return fetchJson<GuildMember[]>(
		`/guilds/${guildId}/members${qs ? `?${qs}` : ""}`
	);
}

export async function fetchExternalGroups(): Promise<ExternalGroup[]> {
	return fetchJson<ExternalGroup[]>(`/external/groups`);
}

// Optional: export for quick debugging elsewhere
export { API_BASE };
