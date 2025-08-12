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

// Accept either base like "http://host:3001" or "http://host:3001/api"
const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, ""); // strip trailing slash
const HAS_API_SUFFIX = /\/api$/i.test(BASE);

function url(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return HAS_API_SUFFIX ? `${BASE}${p}` : `${BASE}/api${p}`;
}

async function j<T>(path: string): Promise<T> {
  const r = await fetch(url(path), { cache: "no-store" });
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
