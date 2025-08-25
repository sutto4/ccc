export type SyncMode = "auto" | "review" | "exempt";

export type EnforcementStatus = "pending" | "enforced" | "exempt" | "failed";

export interface PropagationRow {
  guildId: string;
  guildName: string;
  status: EnforcementStatus;
  lastError?: string;
  updatedAt: string;
}

export interface SyncSettings {
  enabled: boolean;
  mode: SyncMode;
  reviewerRoleIds: string[];
}

export interface SyncSettingsData {
  enabled: boolean;
  mode: SyncMode;
  reviewerRoleIds: string[];
}
