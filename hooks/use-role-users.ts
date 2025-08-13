import { useEffect, useState } from "react";
import { Member } from "@/lib/api";

export function useRoleUsers(guildId: string, roleId: string) {
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/guilds/${guildId}/roles/${roleId}/users`)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .finally(() => setLoading(false));
  }, [guildId, roleId]);
  return { users, loading };
}
