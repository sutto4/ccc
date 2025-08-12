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

export type Features = { custom_groups: boolean; premium_members?: boolean };

export type MembersPage = {
  guildId: string;
  page: { limit: number; after: string; nextAfter: string | null; total: number | null };
  members: Member[];
};

// Accept base like "http://host:3001" or "http://host:3001/api"
const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
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

// legacy
export function fetchMembers(guildId: string) {
  return j<Member[]>(`/guilds/${guildId}/members`);
}

// paged
export function fetchMembersPaged(guildId: string, opts?: { limit?: number; after?: string; q?: string; role?: string; group?: string }) {
  const { limit = 200, after = "0", q = "", role = "", group = "" } = opts || {};
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("after", after);
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (group) params.set("group", group);
  return j<MembersPage>(`/guilds/${guildId}/members-paged?${params.toString()}`);
}
