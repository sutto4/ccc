// app/lib/api.ts
export type Member = {
	discord_id: string;
	discord_username: string;
	accountid: number | null;
	roles: string[];
	groups?: string[];
};

export type Features = { custom_groups: boolean };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function fetchFeatures(guildId: string): Promise<{ guildId: string; features: Features }> {
	const r = await fetch(`${API_BASE}/api/guilds/${guildId}/features`, { cache: 'no-store' });
	if (!r.ok) throw new Error('features_fetch_failed');
	return r.json();
}

export async function fetchMembersAugmented(guildId: string): Promise<{ guildId: string; members: Member[]; features: Features }> {
	const r = await fetch(`${API_BASE}/api/guilds/${guildId}/members-augmented`, { cache: 'no-store' });
	if (!r.ok) throw new Error('members_augmented_fetch_failed');
	return r.json();
}
