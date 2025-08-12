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

// Normalize base (no trailing slash)
const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_BASE = RAW.replace(/\/+$/, ''); // strip trailing slashes

async function j<T>(path: string): Promise<T> {
  // Always prefix with /api here; API_BASE should be just origin like http://host:3001 or empty for same-origin
  const url = `${API_BASE}/api${path}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
  return r.json() as Promise<T>;
}

export function fetchFeatures(guildId: string) {
  return j<{ guildId: string; features: Features }>(`/guilds/${guildId}/features`);
}

export function fetchRoles(guildId: string) {
  return j<Role[]>(`/guilds/${guildId}/roles`);
}

export function fetchMembers(guildId: string) {
  return j<Member[]>(`/guilds/${guildId}/members`);
}
