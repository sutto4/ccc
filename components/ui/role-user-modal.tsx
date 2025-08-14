import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { fetchMembersLegacy, addRole, removeRole } from "@/lib/api";

export function RoleUserModal({
  open,
  onClose,
  guildId,
  role,
  roleUserIds,
}: {
  open: boolean;
  onClose: () => void;
  guildId: string;
  role: any;
  roleUserIds: string[];
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Always fetch members when modal opens or when a reload is triggered
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMembersLegacy(guildId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open, guildId, reloadKey]);

  // Always compute users in role from the latest member data
  const usersInRole = members.filter((m) => m.roleIds && m.roleIds.includes(role.roleId));
  const availableUsers = members.filter((m) => !m.roleIds || !m.roleIds.includes(role.roleId));

  async function handleAdd(userId: string) {
    setPending(true);
    setError(null);
    try {
      await addRole(guildId, userId, role.roleId, "");
      setReloadKey(k => k + 1);
      setSearch("");
    } catch (e: any) {
      setError(e?.message || "Failed to add user");
    } finally {
      setPending(false);
    }
  }
  async function handleRemove(userId: string) {
    setPending(true);
    setError(null);
    try {
      await removeRole(guildId, userId, role.roleId, "");
      setReloadKey(k => k + 1);
      setSearch("");
    } catch (e: any) {
      setError(e?.message || "Failed to remove user");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-[200] inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/10" aria-hidden="true" onClick={onClose} />
      <div
        className="relative rounded-xl shadow-xl p-6 w-full max-w-3xl mx-auto z-10 backdrop-blur-md border border-gray-200"
        style={{
          background: 'rgba(255,255,255,0.35)',
          color: '#111827',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
          maxWidth: '720px'
        }}
      >
        <Dialog.Title className="text-lg font-semibold mb-2">Edit Users for {role.name}</Dialog.Title>
        <div className="mb-2 text-xs text-muted-foreground">Role ID: {role.roleId}</div>
        <div className="mb-2">
          <div className="font-semibold text-sm mb-4">Manage Users</div>
          <div className="flex flex-row gap-6">
            {/* Available users to add */}
            <div className="flex-1 min-w-0">
              <div className="mb-2 font-medium">Available Users</div>
              <input
                className="w-full rounded border px-3 py-2 text-sm mb-2"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={loading}
              />
              <div className="max-h-56 overflow-y-auto rounded border bg-card text-foreground">
                {loading ? (
                  <div className="text-xs text-muted-foreground px-2 py-2">Loading...</div>
                ) : (
                  availableUsers
                    .filter(u =>
                      search === "" || u.username.toLowerCase().includes(search.toLowerCase()) || u.discordUserId.includes(search)
                    )
                    .map(u => (
                      <div
                        key={u.discordUserId}
                        className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition hover:bg-blue-50"
                      >
                        <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                        <span className="truncate text-xs font-medium">{u.username}</span>
                        <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                        <button
                          className="ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold bg-green-600 text-white shadow hover:bg-green-700 transition disabled:opacity-50"
                          onClick={() => handleAdd(u.discordUserId)}
                          disabled={pending}
                          title="Add to role"
                        >+</button>
                      </div>
                    ))
                )}
              </div>
            </div>
            {/* Users in role */}
            <div className="flex-1 min-w-0">
              <div className="mb-2 font-medium">Users in Role</div>
              <input
                className="w-full rounded border px-3 py-2 text-sm mb-2"
                placeholder="Search users in role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={loading}
              />
              <div className="max-h-56 overflow-y-auto rounded border bg-white/40 mb-2">
                {loading ? (
                  <div className="text-xs text-muted-foreground px-2 py-2">Loading...</div>
                ) : (
                  usersInRole
                    .filter(u =>
                      search === "" || u.username.toLowerCase().includes(search.toLowerCase()) || u.discordUserId.includes(search)
                    )
                    .map(u => (
                      <div
                        key={u.discordUserId}
                        className="flex items-center gap-2 px-2 py-1 rounded transition hover:bg-red-50"
                      >
                        <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                        <span className="truncate text-xs font-medium">{u.username}</span>
                        <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                        <button
                          className="ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold bg-red-500 text-white shadow hover:bg-red-600 transition disabled:opacity-50"
                          onClick={() => handleRemove(u.discordUserId)}
                          disabled={pending}
                          title="Remove from role"
                        >×</button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition"
              onClick={onClose}
            >Close</button>
          </div>
          {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
        </div>
      </div>
    </Dialog>
  );
}
