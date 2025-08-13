"use client";
import { useEffect, useState } from "react";
import { fetchMembersPaged } from "@/lib/api";

export default function RoleUsersList({ guildId, roleId }: { guildId: string; roleId: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMembersPaged(guildId, { role: roleId, limit: 50 })
      .then((res) => setUsers(res.members || []))
      .finally(() => setLoading(false));
  }, [guildId, roleId]);

  if (loading) return <div className="text-xs text-muted-foreground">Loading users…</div>;
  if (!users.length) return <div className="text-xs text-muted-foreground">No users in this role.</div>;

  return (
    <ul className="mt-2 space-y-1 text-xs">
      {users.map((u) => (
        <li key={u.discordUserId} className="flex items-center gap-2">
          <span className="font-mono">{u.username}</span>
          <span className="text-muted-foreground">({u.discordUserId})</span>
        </li>
      ))}
    </ul>
  );
}
