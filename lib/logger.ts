// lib/logger.ts
// Simple reusable logger for audit actions. Replace with DB or API integration as needed.

export type LogActionType =
  | "role.add"
  | "role.remove"
  | "group.add"
  | "group.remove"
  | "user.edit"
  | string;

export interface LogEntry {
  guildId: string;
  userId: string;
  user?: { id: string; username?: string };
  actionType: LogActionType;
  actionData?: any;
  timestamp?: string;
  ip?: string;
}

// For now, just POST to an API route (to be implemented)
export async function logAction(entry: LogEntry) {
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entry, timestamp: entry.timestamp || new Date().toISOString() })
    });
  } catch (e) {
    // Optionally handle/log error
    console.error("Failed to log action", e);
  }
}
