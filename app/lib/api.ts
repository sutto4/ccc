// app/lib/api.ts
export type Role = {
	guildId: string;
	roleId: string;
	name: string;
	color: string | null;
};

export type Member = {
	guildId: string;
	discordUserId: string;
	username: string;
	roleIds: string[];
	accountid: string | null;
	groups?: string[];
};

export type Features = { custom_groups: boolean };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

async function j<T>(url: string): Promise<T> {
	const r = await fetch(url, { cache: 'no-store' });
	if (!r.ok) throw new Error(`${url} failed: ${r.status}`);
	return r.json() as Promise<T>;
}

export function fetchFeatures(guildId: string) {
	return j<{ guildId: string; features: Features }>(`${API_BASE}/api/guilds/${guildId}/features`);
}

export function fetchRoles(guildId: string) {
	return j<Role[]>(`${API_BASE}/api/guilds/${guildId}/roles`);
}

export function fetchMembers(guildId: string) {
	return j<Member[]>(`${API_BASE}/api/guilds/${guildId}/members`);
}
