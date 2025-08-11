import type { ExternalGroup, GuildMember, GuildRole } from "./types"
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export async function fetchRoles(guildId: string): Promise<GuildRole[]> {
  const url = API_BASE ? `${API_BASE}/guilds/${guildId}/roles` : `/api/mock/guilds/${guildId}/roles`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load roles")
  return res.json()
}

export async function fetchMembers(
  guildId: string,
  params: { q?: string; role?: string[]; group?: string[] },
): Promise<GuildMember[]> {
  const usp = new URLSearchParams()
  if (params.q) usp.set("q", params.q)
  if (params.role?.length) usp.set("role", params.role.join(","))
  if (params.group?.length) usp.set("group", params.group.join(","))
  const path = API_BASE
    ? `${API_BASE}/guilds/${guildId}/members?${usp.toString()}`
    : `/api/mock/guilds/${guildId}/members?${usp.toString()}`
  const res = await fetch(path, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load members")
  return res.json()
}

export async function fetchExternalGroups(): Promise<ExternalGroup[]> {
  const url = API_BASE ? `${API_BASE}/external/groups` : `/api/mock/external/groups`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load external groups")
  return res.json()
}
