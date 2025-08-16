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
  position?: number
  managed?: boolean
  editableByBot?: boolean
  iconUrl?: string | null
  unicodeEmoji?: string | null
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

function buildOriginForServer(): string {
  // Default localhost for server-side when no explicit origin provided
  return 'http://localhost:3000'
}

function u(path: string) {
  const isBrowser = typeof window !== 'undefined'

  // If BASE is an absolute URL
  if (/^https?:\/\//i.test(BASE)) {
    const hasApiSuffix = /\/api$/i.test(BASE)
    const apiBase = hasApiSuffix ? BASE : `${BASE}/api`
    return `${apiBase}${path}`
  }

  // If BASE is exactly '/api' or empty
  if (BASE === '' || BASE === '/api') {
    if (isBrowser) {
      // Browser can use relative
      return `/api${path}`
    }
    // Server must use absolute
    return `${buildOriginForServer()}/api${path}`
  }

  // If BASE is another relative base like '/foo'
  if (BASE.startsWith('/')) {
    if (isBrowser) {
      return `${BASE}${path}`
    }
    return `${buildOriginForServer()}${BASE}${path}`
  }

  // Fallback (should not hit)
  return `${buildOriginForServer()}/api${path}`
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const url = u(path);
  console.log(`[lib/api] fetching`, url, `BASE=${BASE || '(empty)'} RAW=${RAW || '(empty)'} isBrowser=${typeof window !== 'undefined'}`);
  const res = await fetch(url, {
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

export async function fetchGuilds(accessToken?: string): Promise<Guild[]> {
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<Guild[]>('/guilds', { headers })
}

export async function fetchRoles(guildId: string): Promise<Role[]> {
  const res = await j<any>(`/guilds/${guildId}/roles`)
  if (Array.isArray(res)) return res as Role[]
  if (res && Array.isArray(res.roles)) return res.roles as Role[]
  return []
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
