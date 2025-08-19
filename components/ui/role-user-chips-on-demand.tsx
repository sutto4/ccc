import { useState } from "react";
import { UserChips } from "@/components/ui/user-chips";
import { useGuildMembersKanban } from "@/hooks/use-guild-members";

export function RoleUserChipsOnDemand({ guildId, roleId, max = 3 }: { guildId: string; roleId: string; max?: number }) {
  const [showUsers, setShowUsers] = useState(false);
  
  // Use the shared hook for member management
  const { members: allMembers, loading, error } = useGuildMembersKanban(guildId);
  
  // Filter users in the role
  const usersInRole = allMembers.filter((m: any) => Array.isArray(m.roleIds) && m.roleIds.includes(roleId));
  
  if (showUsers) {
    return usersInRole.length === 0 ? <span className="text-muted-foreground">No users</span> : <UserChips users={usersInRole} max={max} />;
  }
  
  return (
    <button 
      className="rounded border px-2 py-1 text-xs bg-muted hover:bg-muted/70 transition" 
      onClick={() => setShowUsers(true)} 
      disabled={loading}
    >
      {loading ? "Loading..." : "Show Users"}
    </button>
  );
}
