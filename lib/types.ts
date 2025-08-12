export type Guild = {
	id: string;
	name: string;
	// optional fields so UI won’t crash if API omits them
	memberCount?: number;
	roleCount?: number;     // preferred
	rolesCount?: number;    // legacy UI key fallback
	icon?: string | null;
	iconUrl?: string | null;
	premium?: boolean;
	createdAt?: string | null; // ISO string if you send it
};

export type GuildRole = {
	guildId: string;
	roleId: string;
	name: string;
	color: string | null;
};

export type GuildMember = {
	guildId: string;
	discordUserId: string;
	username: string;
	roleIds: string[];
	accountid: string | null;
	// add more fields if you show them
};

export type ExternalGroup = {
	accountid: string;
	group: string;
	assigned_on: string; // or Date ISO
	assigned_by: string;
};

export type Guild = {
  id: string;
  name: string;
  memberCount?: number;
  roleCount?: number;
  rolesCount?: number;
  icon?: string | null;
  iconUrl?: string | null;
  premium?: boolean;
  createdAt?: string | null;
};

export type GuildRole = {
  guildId: string;
  roleId: string;
  name: string;
  color: string | null;
  hoist?: boolean;
  mentionable?: boolean;
};

export type ExternalGroup = {
  accountid: string;
  group: string;
};

