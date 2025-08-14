// lib/api.ts

import { env } from "@/lib/env";

// Types
export type Guild = {
  id: string
  name: string
  memberCount?: number
  roleCount?: number
  iconUrl?: string | null
  premium?: boolean
  createdAt?: string | null
}

export type Role = {
  guildId: string
  roleId: string
  name: string
  color: string | null
  managed?: boolean
  editableByBot?: boolean
}

export type Member = {
  guildId: string
  discordUserId: string
  username: string
  roleIds: string[]
  accountid?: string | null
  groups?: string[]
  avatarUrl?: string | null
}

export type Features = {
  custom_groups?: boolean
  premium_members?: boolean
}

export type FeaturesResponse = {
  guildId: string
  features: Features
}

export type Paged<T> = {
  members: T[]
  page: { nextAfter: string | null; total?: number | null }
  source?: 'legacy' | 'gateway' | 'rest'
  debug?: unknown
}

// Base URL helper
const RAW = env.NEXT_PUBLIC_API_BASE_URL || ''
const BASE = RAW.replace(/\/+$/, '') // strip trailing slashes

function u(path: string) {
  // paths in this file should start with "/" like "/guilds"
  return `${BASE}${path}`
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(u(path), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text, (_key, value) => {
      if (typeof value === 'bigint') return value.toString();
      return value;
    });
  } catch (e) {
    if (!res.ok) {
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    throw e;
  }
  if (!res.ok) {
    const msg = typeof parsed?.error === 'string' ? parsed.error : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return parsed as T;
}

// API functions

export async function fetchGuilds(_accessToken?: string): Promise<Guild[]> {
  return j<Guild[]>('/guilds')
}

export async function fetchRoles(guildId: string): Promise<Role[]> {
  return j<Role[]>(`/guilds/${guildId}/roles`)
}

export const fetchMembersLegacy = (guildId: string) =>
  j<Member[]>(`/guilds/${guildId}/members`)

export async function fetchMembersPaged(
  guildId: string,
  opts: {
    limit?: number
    after?: string | null
    role?: string
    q?: string
    group?: string
    all?: boolean
    source?: 'gateway' | 'rest'
    debug?: boolean
  } = {}
): Promise<Paged<Member>> {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.after != null) params.set('after', String(opts.after))
  if (opts.role) params.set('role', opts.role)
  if (opts.q) params.set('q', opts.q)
  if (opts.group) params.set('group', opts.group)
  if (opts.all) params.set('all', '1')
  if (opts.source) params.set('source', opts.source)
  if (opts.debug) params.set('debug', '1')

  const qs = params.toString()
  return j<Paged<Member>>(`/guilds/${guildId}/members-paged${qs ? `?${qs}` : ''}`)
}

export async function searchMembers(guildId: string, q: string, limit = 25): Promise<Member[]> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  return j<Member[]>(`/guilds/${guildId}/members-search?${params.toString()}`)
}

export async function addRole(
  guildId: string,
  userId: string,
  roleId: string,
  actorId: string
): Promise<{ ok: true }> {
  const qs = new URLSearchParams({ actor: actorId })
  return j<{ ok: true }>(`/guilds/${guildId}/members/${userId}/roles/${roleId}?${qs}`, {
    method: 'POST',
  })
}

export async function removeRole(
  guildId: string,
  userId: string,
  roleId: string,
  actorId: string
): Promise<{ ok: true }> {
  const qs = new URLSearchParams({ actor: actorId })
  return j<{ ok: true }>(`/guilds/${guildId}/members/${userId}/roles/${roleId}?${qs}`, {
    method: 'DELETE',
  })
}

export function fetchFeatures(guildId: string): Promise<FeaturesResponse> {
  return j<FeaturesResponse>(`/guilds/${guildId}/features`)
}
