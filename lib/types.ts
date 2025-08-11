export type AppRole = "owner" | "admin" | "viewer"

export type Guild = {
  id: string
  name: string
  icon?: string
  premium: boolean
  rolesCount: number
  memberCount: number
}

export type GuildRole = {
  guildId: string
  roleId: string
  name: string
  color?: string
}

export type GuildMember = {
  guildId: string
  discordUserId: string
  username: string
  roleIds: string[]
  accountid?: string | null
}

export type ExternalGroup = {
  accountid: string
  group: string
  assigned_on: string
  assigned_by: string
}

export type AccountLink = {
  accountid: string
  discordUserId: string
  createdAt: string
}

export type AuditLog = {
  id: string
  actorUserId: string
  guildId: string
  action: string
  targetId?: string | null
  diff: Record<string, unknown>
  createdAt: string
}
