import { useState } from "react";
import { UserChips } from "@/components/ui/user-chips";
import { fetchMembersLegacy } from "@/lib/api";

export function RoleUserChipsOnDemand({ guildId, roleId, max = 3 }: { guildId: string; roleId: string; max?: number }) {
  const [users, setUsers] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleShow = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchMembersLegacy(guildId);
      setUsers(all.filter((m: any) => Array.isArray(m.roleIds) && m.roleIds.includes(roleId)));
    } catch (e: any) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  if (users) {
    return users.length === 0 ? <span className="text-muted-foreground">No users</span> : <UserChips users={users} max={max} />;
  }
  return (
    <button className="rounded border px-2 py-1 text-xs bg-muted hover:bg-muted/70 transition" onClick={handleShow} disabled={loading}>
      {loading ? "Loading..." : "Show Users"}
    </button>
  );
}
