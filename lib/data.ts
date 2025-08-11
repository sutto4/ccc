import type { AccountLink, ExternalGroup, Guild, GuildMember, GuildRole } from "./types"

const PREMIUM_FLAG = process.env.NEXT_PUBLIC_PREMIUM === "true"

export function getMockGuilds(): Guild[] {
  return [
    { id: "1001", name: "Alpha Squad", icon: "🅰️", premium: PREMIUM_FLAG || true, rolesCount: 12, memberCount: 1245 },
    { id: "1002", name: "Beta Builders", icon: "🅱️", premium: PREMIUM_FLAG || false, rolesCount: 8, memberCount: 502 },
    { id: "1003", name: "Gamma Guild", icon: "🌀", premium: PREMIUM_FLAG || false, rolesCount: 20, memberCount: 9012 },
  ]
}

export function getMockGuildById(id: string) {
  return getMockGuilds().find((g) => g.id === id)
}

export function getMockRoles(guildId: string): GuildRole[] {
  const base = [
    { roleId: "1", name: "Admin", color: "#ef4444" },
    { roleId: "2", name: "Moderator", color: "#f59e0b" },
    { roleId: "3", name: "Member", color: "#10b981" },
    { roleId: "4", name: "VIP", color: "#8b5cf6" },
    { roleId: "5", name: "Muted", color: "#6b7280" },
    { roleId: "6", name: "Dev", color: "#22c55e" },
  ]
  return base.map((r) => ({ ...r, guildId }))
}

export function getMockMembers(guildId: string): GuildMember[] {
  const usernames = [
    ["100", "jane.doe"],
    ["101", "john.smith"],
    ["102", "lambda"],
    ["103", "phoenix"],
    ["104", "atlas"],
    ["105", "zephyr"],
    ["106", "nebula"],
    ["107", "orion"],
    ["108", "solstice"],
    ["109", "aurora"],
  ]
  const roles = getMockRoles(guildId)
  const roleIds = roles.map((r) => r.roleId)
  const members: GuildMember[] = usernames.map(([id, name], i) => ({
    guildId,
    discordUserId: id,
    username: name,
    roleIds: [roleIds[2], roleIds[i % roleIds.length]].filter(Boolean),
    accountid: i % 2 === 0 ? `${1 + (i % 3)}` : null,
  }))
  return members
}

export function getMockLinks(): AccountLink[] {
  return [
    { accountid: "1", discordUserId: "100", createdAt: "2024-07-21T23:57:29Z" },
    { accountid: "1", discordUserId: "102", createdAt: "2024-07-21T23:57:29Z" },
    { accountid: "2", discordUserId: "105", createdAt: "2021-09-17T23:28:36Z" },
  ]
}

export function getMockExternalGroups(): ExternalGroup[] {
  return [
    { accountid: "1", group: "admin", assigned_on: "2024-07-21 23:57:29", assigned_by: "1" },
    { accountid: "1", group: "developer", assigned_on: "2021-09-07 15:58:39", assigned_by: "4368" },
    { accountid: "1", group: "leadership_team", assigned_on: "2021-09-16 14:16:29", assigned_by: "4368" },
    { accountid: "1", group: "logs_restrictedAC", assigned_on: "2024-08-19 19:44:39", assigned_by: "50" },
    { accountid: "1", group: "restricted_account", assigned_on: "2021-09-20 01:19:56", assigned_by: "2" },
    { accountid: "1", group: "verified_menu", assigned_on: "2024-07-22 19:29:58", assigned_by: "1" },
    { accountid: "1", group: "webpanel_dev", assigned_on: "2022-01-13 20:45:40", assigned_by: "1" },
    { accountid: "2", group: "admin", assigned_on: "2021-09-17 23:28:36", assigned_by: "1" },
  ]
}

export function getMockGuildStats(guildId: string) {
  return {
    members: getMockMembers(guildId).length,
    roles: getMockRoles(guildId).length,
    changes: 12,
  }
}
