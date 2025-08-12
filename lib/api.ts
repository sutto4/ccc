// app/lib/api.ts

export type Guild = {
  id: string;
  name: string;
  memberCount: number;
  roleCount: number;
  iconUrl: string | null;
  premium: boolean;
  createdAt: string | null;
};

export type Role = {
  guildId: string;
  roleId: string;
  name: string;
  color: string | null;
  managed?: boolean;
  editableByBot?: boolean;
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

const RAW = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const HAS_API_SUFFIX = /\/api$/i.test(BASE);
const toUrl = (p: string) => (HAS_API_SUFFIX ? `${BASE}${p}` : `${BASE}/api${p}`);

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(toUrl(path), { cache: "no-store", ...(init || {}) });
  if (!r.ok) {
    let msg = `${path} failed: ${r.status}`;
    try {
      const body = await r.json();
      if (body?.error) msg = body.error;
      else if (body?.message) msg = body.message;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

// Guilds
export const fetchGuilds = (accessToken?: string) => {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return j<Guild[]>("/guilds", { headers });
};

// Features and roles
export const fetchFeatures = (guildId: string) =>
  j<{ guildId: string; features: Features }>(`/guilds/${guildId}/features`);

export const fetchRoles = (guildId: string) => j<Role[]>(`/guilds/${guildId}/roles`);

// Members
export function fetchMembersPaged(
  guildId: string,
  opts?: {
    limit?: number;
    after?: string;
    q?: string;
    role?: string;
    group?: string;
    all?: boolean;
    source?: "auto" | "rest" | "gateway";
    debug?: boolean;
  }
) {
  const { limit = 200, after = "0", q = "", role = "", group = "", all = false, source = "auto", debug = false } =
    opts || {};
  const p = new URLSearchParams();
  p.set("limit", String(limit));
  p.set("after", after);
  if (q) p.set("q", q);
  if (role) p.set("role", role);
  if (group) p.set("group", group);
  if (all) p.set("all", "true");
  if (source !== "auto") p.set("source", source);
  if (debug) p.set("debug", "1");
  return j<MembersPage>(`/guilds/${guildId}/members-paged?${p.toString()}`);
}

export const searchMembers = (guildId: string, q: string, limit = 25) => {
  const params = new URLSearchParams({ q, limit: String(limit) });
  return j<Member[]>(`/guilds/${guildId}/members-search?${params.toString()}`);
};

export const addRole = (guildId: string, userId: string, roleId: string, callerId: string) =>
  j<{ ok: true }>(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "POST",
    headers: { "x-user-id": callerId },
  });

export const removeRole = (guildId: string, userId: string, roleId: string, callerId: string) =>
  j<{ ok: true }>(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "DELETE",
    headers: { "x-user-id": callerId },
  });
