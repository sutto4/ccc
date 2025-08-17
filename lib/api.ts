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
  permissions?: string[]
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
  // Free features
  verification_system?: boolean
  feedback_system?: boolean
  moderation?: boolean
  
  // Premium features
  fdg_donator_sync?: boolean
  custom_prefix?: boolean
  fivem_esx?: boolean
  fivem_qbcore?: boolean
  reaction_roles?: boolean
  custom_commands?: boolean
  creator_alerts?: boolean
  bot_customisation?: boolean
  embedded_messages?: boolean
  
  // Legacy names for backward compatibility
  esx?: boolean // maps to fivem_esx
  qbcore?: boolean // maps to fivem_qbcore
  custom_groups?: boolean // placeholder for future feature
  premium_members?: boolean // placeholder for future feature
  
  // Package requirements for each feature
  verification_system_package?: string
  feedback_system_package?: string
  moderation_package?: string
  fdg_donator_sync_package?: string
  custom_prefix_package?: string
  fivem_esx_package?: string
  fivem_qbcore_package?: string
  reaction_roles_package?: string
  custom_commands_package?: string
  creator_alerts_package?: string
  bot_customisation_package?: string
  embedded_messages_package?: string
}

export type FeaturesResponse = {
  guildId: string
  features: Features
}

export type RolePermission = {
  roleId: string
  roleName: string
  canUseApp: boolean
}

export type PermissionCheck = {
  canUseApp: boolean
  isOwner: boolean
  hasRoleAccess: boolean
  userId: string
  userRoles: string[]
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
    }
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

export async function fetchRoles(guildId: string, accessToken?: string): Promise<Role[]> {
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  
  // Try to fetch roles with permissions data
  const res = await j<any>(`/guilds/${guildId}/roles?include_permissions=true`, { headers })
  
  if (Array.isArray(res)) return res as Role[]
  if (res && Array.isArray(res.roles)) return res.roles as Role[]
  return []
}

export const fetchMembersLegacy = (guildId: string, accessToken?: string) => {
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<Member[]>(`/guilds/${guildId}/members`, { headers })
}

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
    accessToken?: string
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
  const headers: Record<string, string> = {}
  if (opts.accessToken) headers["Authorization"] = `Bearer ${opts.accessToken}`
  return j<Paged<Member>>(`/guilds/${guildId}/members-paged${qs ? `?${qs}` : ''}`, { headers })
}

export async function searchMembers(guildId: string, q: string, limit = 25, accessToken?: string): Promise<Member[]> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<Member[]>(`/guilds/${guildId}/members-search?${params.toString()}`, { headers })
}

export async function addRole(
  guildId: string,
  userId: string,
  roleId: string,
  actorId: string,
  accessToken?: string
): Promise<{ ok: true }> {
  const qs = new URLSearchParams({ actor: actorId })
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<{ ok: true }>(`/guilds/${guildId}/members/${userId}/roles/${roleId}?${qs}`, {
    method: 'POST',
    headers,
  })
}

export async function removeRole(
  guildId: string,
  userId: string,
  roleId: string,
  actorId: string,
  accessToken?: string
): Promise<{ ok: true }> {
  const qs = new URLSearchParams({ actor: actorId })
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<{ ok: true }>(`/guilds/${guildId}/members/${userId}/roles/${roleId}?${qs}`, {
    method: 'DELETE',
    headers,
  })
}

export function fetchFeatures(guildId: string): Promise<FeaturesResponse> {
  return j<FeaturesResponse>(`/guilds/${guildId}/features`)
}

// Role permission functions
export async function fetchRolePermissions(guildId: string, accessToken?: string): Promise<RolePermission[]> {
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<RolePermission[]>(`/guilds/${guildId}/role-permissions`, { headers })
}

export async function updateRolePermissions(
  guildId: string, 
  permissions: RolePermission[], 
  accessToken?: string
): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<{ success: boolean; message: string }>(`/guilds/${guildId}/role-permissions`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ permissions })
  })
}

export async function checkUserPermissions(
  guildId: string, 
  userId: string, 
  userRoles: string[], 
  accessToken?: string
): Promise<PermissionCheck> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  return j<PermissionCheck>(`/guilds/${guildId}/role-permissions/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, userRoles })
  })
}
