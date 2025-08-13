"use client";
import { useEffect, useState } from "react";
import { fetchMembersPaged, searchMembers, addRole, removeRole } from "@/lib/api";
import { useSession } from "next-auth/react";
const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

export default function RoleUsersList({ guildId, roleId }: { guildId: string; roleId: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const { data: session } = useSession();

  // Fetch users in this role, with search
  useEffect(() => {
    setLoading(true);
    fetchMembersPaged(guildId, { role: roleId, q: search, limit: 50 })
      .then((res) => setUsers(res.members || []))
      .finally(() => setLoading(false));
  }, [guildId, roleId, search]);

  // Search for users to add (not in role)
  useEffect(() => {
    if (!addOpen || !addQuery) {
      setAddResults([]);
      return;
    }
    let ignore = false;
    searchMembers(guildId, addQuery, 10).then((res) => {
      if (ignore) return;
      // Filter out users already in this role
      setAddResults(res.filter((u) => !users.some((m) => m.discordUserId === u.discordUserId)));
    });
    return () => { ignore = true; };
  }, [addQuery, addOpen, guildId, users]);

  async function handleAdd(userId: string) {
    if (!session?.user?.id) return;
    setAdding(true);
    try {
      await addRole(guildId, userId, roleId, session.user.id);
      setUsers((prev) => [...prev, addResults.find((u) => u.discordUserId === userId)]);
      setAddOpen(false);
      setAddQuery("");
      setAddResults([]);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!session?.user?.id) return;
    setAdding(true);
    try {
      await removeRole(guildId, userId, roleId, session.user.id);
      setUsers((prev) => prev.filter((u) => u.discordUserId !== userId));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <input
          className="w-full sm:max-w-xs rounded-md border px-3 py-2 text-sm bg-background"
          placeholder="Search users in this role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="rounded-full border p-0.5 w-7 h-7 flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50"
          onClick={() => setAddOpen((v) => !v)}
          disabled={adding}
          title={addOpen ? "Cancel" : "Add user"}
        >
          {addOpen ? <span className="text-lg">×</span> : <span className="text-lg font-bold">+</span>}
        </button>

      </div>
      {addOpen && (
        <div className="mb-4 p-3 border rounded-lg bg-muted/30">
          <input
            className="w-full rounded-md border px-3 py-2 text-xs mb-2 bg-background"
            placeholder="Search for users to add..."
            value={addQuery}
            onChange={e => setAddQuery(e.target.value)}
            autoFocus
          />
          {addResults.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto divide-y divide-border bg-background rounded-md">
              {addResults.map((u) => (
                <li key={u.discordUserId} className="flex items-center gap-3 py-2 px-1 hover:bg-accent/40 transition">
                  <img
                    src={u.avatarUrl || DEFAULT_AVATAR}
                    alt={u.username}
                    className="w-7 h-7 rounded-full border bg-muted object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-xs truncate">{u.username}</div>
                    {u.accountid && <div className="text-[10px] text-muted-foreground truncate">{u.accountid}</div>}
                  </div>
                  {/* Discord ID removed for cleaner UI */}
                  <button
                    className="ml-auto rounded-full border p-0.5 w-7 h-7 flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50"
                    onClick={() => handleAdd(u.discordUserId)}
                    disabled={adding}
                    title="Add user"
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : addQuery ? (
            <div className="text-xs text-muted-foreground">No users found.</div>
          ) : null}
        </div>
      )}
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="text-xs text-muted-foreground">No users in this role.</div>
      ) : (
        <ul className="divide-y divide-border bg-background rounded-md">
          {users.map((u) => (
            <li key={u.discordUserId} className="flex items-center gap-3 py-2 px-1 hover:bg-accent/40 transition">
              <img
                src={u.avatarUrl || DEFAULT_AVATAR}
                alt={u.username}
                className="w-7 h-7 rounded-full border bg-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-xs truncate">{u.username}</div>
                {u.accountid && <div className="text-[10px] text-muted-foreground truncate">{u.accountid}</div>}
              </div>
              {/* Discord ID removed for cleaner UI */}
              <button
                className="ml-auto rounded-full border p-0.5 w-7 h-7 flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
                onClick={() => handleRemove(u.discordUserId)}
                disabled={adding}
                title="Remove user"
              >
                <span className="text-lg font-bold">-</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
