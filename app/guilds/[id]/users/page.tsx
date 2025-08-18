"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import {
  fetchMembersLegacy,
  fetchRoles,
  addRole,
  removeRole,
  type Role,
} from "@/lib/api";
import { logAction } from "@/lib/logger";
import { Select } from "@/components/ui/select";

type Member = {
  guildId: string;
  discordUserId: string;
  username: string;
  avatarUrl: string;
  roleIds: string[];
  accountid: string | null;
  groups?: string[];
  joinedAt?: string | null;
};
import { useSession } from "next-auth/react";

type Row = Member & { rolesExpanded?: boolean };

const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UsersPage() {
  const params = useParams<{ id: string }>();
  const guildId = params?.id ?? "";
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [displayed, setDisplayed] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [pageSize, setPageSize] = useState(50); // Configurable page size
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);
  const [modalRole, setModalRole] = useState<string>("");
  const [searchRole, setSearchRole] = useState("");

  // Debounce search input to prevent excessive filtering
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const token = (session as any)?.accessToken as string | undefined;
        if (!token) return; // wait for session
        const [m, r] = await Promise.all([
          fetchMembersLegacy(guildId, token),
          fetchRoles(guildId, token),
        ]);
        if (!alive) return;
        const withAvatars = m.map((mem: any) => ({
          ...mem,
          avatarUrl: typeof mem.avatarUrl === "string" && mem.avatarUrl ? mem.avatarUrl : DEFAULT_AVATAR,
        }));
        setMembers(withAvatars);
        setRoles(r);
      } catch (e: any) {
        setError(e?.message || "failed");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId, (session as any)?.accessToken]);

  // Memoized filtered results - only recalculates when filters actually change
  const filteredMembers = useMemo(() => {
    let filtered = members;
    
    // Apply search filter (case-insensitive)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((u) =>
        u.username.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter((u) => u.roleIds.includes(roleFilter));
    }
    
    return filtered;
  }, [members, debouncedSearch, roleFilter]);

  // Memoized displayed results - only recalculates when page or pageSize changes
  const displayedMembers = useMemo(() => {
    return filteredMembers.slice(0, page * pageSize);
  }, [filteredMembers, page, pageSize]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && displayedMembers.length < filteredMembers.length) {
        setPage((p) => p + 1);
      }
    });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [displayedMembers.length, filteredMembers.length]);

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.roleId, r])), [roles]);

  const availableRolesFor = (row: Row) =>
    roles.filter(
      (r) =>
        !row.roleIds.includes(r.roleId) &&
        r.roleId !== guildId &&
        (r as any).managed !== true &&
        (r as any).editableByBot !== false
    );

  // Memoized callback for role operations
  const handleAddRole = useCallback(async (userId: string, roleId: string) => {
    try {
      const actor = (session?.user as any)?.id || "";
      const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
      // Find user and role before addition
      const targetUser = members.find((m) => m.discordUserId === userId);
      const roleObj = roles.find((r) => r.roleId === roleId);
      await addRole(guildId, userId, roleId, actor, (session as any)?.accessToken);
      setMembers((prev) =>
        prev.map((m) =>
          m.discordUserId === userId
            ? { ...m, roleIds: [...m.roleIds, roleId] }
            : m
        )
      );
      // Logging
      logAction({
        guildId,
        userId: actor,
        actionType: "role.add",
        user: { id: actor, username: actorUsername },
        actionData: {
          targetUser: userId,
          targetUsername: targetUser?.username,
          role: roleId,
          roleName: roleObj?.name || roleId,
          source: "users-page"
        }
      });
    } catch (e: any) {
      alert(`Add failed: ${e?.message || "unknown"}`);
    }
  }, [guildId, members, roles, session]);

  const onRemove = useCallback(async (userId: string, roleId: string) => {
    try {
      const actor = (session?.user as any)?.id || "";
      const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
      // Find user and role before removal
      const targetUser = members.find((m) => m.discordUserId === userId);
      const roleObj = roles.find((r) => r.roleId === roleId);
      await removeRole(guildId, userId, roleId, actor, (session as any)?.accessToken);
      setMembers((prev) =>
        prev.map((m) =>
          m.discordUserId === userId
            ? { ...m, roleIds: m.roleIds.filter((r) => r !== roleId) }
            : m
        )
      );
      // Logging
      logAction({
        guildId,
        userId: actor,
        actionType: "role.remove",
        user: { id: actor, username: actorUsername },
        actionData: {
          targetUser: userId,
          targetUsername: targetUser?.username,
          role: roleId,
          roleName: roleObj?.name || roleId,
          source: "users-page"
        }
      });
    } catch (e: any) {
      alert(`Remove failed: ${e?.message || "unknown"}`);
    }
  }, [guildId, members, roles, session]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const hasMore = displayedMembers.length < filteredMembers.length;
  const showingInfo = `${displayedMembers.length.toLocaleString()} of ${filteredMembers.length.toLocaleString()} users`;

  return (
    <Section
      title="Users"
      right={
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading…" : showingInfo}
        </div>
      }
    >
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="mb-4 flex gap-2 items-center flex-wrap">
        <input
          type="text"
          className="w-full max-w-xs rounded-md border px-2 py-1 text-xs bg-background"
          placeholder="Search users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          className="w-48 text-xs"
          value={roleFilter}
          onChange={e => {
            setRoleFilter((e.target as HTMLSelectElement).value);
          }}
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.roleId} value={r.roleId}>{r.name}</option>
          ))}
        </Select>
        
        {/* Page size selector */}
        <Select
          className="w-24 text-xs"
          value={pageSize.toString()}
          onChange={e => {
            const newSize = parseInt((e.target as HTMLSelectElement).value);
            setPageSize(newSize);
            setPage(1); // Reset to first page
          }}
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-semibold">User</th>
              <th className="px-3 py-2 text-left font-semibold">Date Joined</th>
              <th className="px-3 py-2 text-left font-semibold">Roles</th>
            </tr>
          </thead>
          <tbody>
            {!loading && displayedMembers.map((m) => (
              <tr
                key={m.discordUserId}
                className="border-b last:border-0 cursor-pointer transition hover:bg-primary/10 hover:shadow-md"
                onClick={() => setSelectedUser(m)}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={m.avatarUrl || DEFAULT_AVATAR}
                      alt={m.username}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full border bg-muted object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-medium truncate" title={m.username}>{m.username}</span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {m.roleIds.map((rid) => {
                      const r = roleMap.get(rid);
                      const name = r?.name ?? "unknown";
                      const color = r?.color || null;
                      return (
                        <span
                          key={rid}
                          className="inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: color ? `${color}20` : undefined,
                            borderColor: color || undefined,
                          }}
                          title={rid}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
      {/* Modal for add/remove roles */}
      {selectedUser && (
        <Dialog open={true} onClose={() => { setSelectedUser(null); setModalRole(""); }} className="fixed z-[200] inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm" aria-hidden="true" onClick={() => { setSelectedUser(null); setModalRole(""); }} />
          <div
            className="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-auto z-10 border bg-white/70 text-black backdrop-blur-lg border-white/60"
          >
            <Dialog.Title className="text-lg font-semibold mb-2">Manage Roles for {selectedUser.username}</Dialog.Title>
            <div className="mb-2 text-xs text-muted-foreground">Discord ID: {selectedUser.discordUserId}</div>
            <div className="mb-2">
              <div className="font-semibold text-sm mb-1">Current Roles</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUser.roleIds.length > 0 ? selectedUser.roleIds.map((rid) => {
                  const r = roleMap.get(rid);
                  const name = r?.name ?? "unknown";
                  const color = r?.color || null;
                  return (
                    <span
                      key={rid}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                      style={{ backgroundColor: color ? `${color}20` : undefined, borderColor: color || undefined }}
                      title={rid}
                    >
                      {name}
                      <button
                        onClick={async () => {
                          await onRemove(selectedUser.discordUserId, rid);
                          setSelectedUser((prev) => prev ? { ...prev, roleIds: prev.roleIds.filter((r) => r !== rid) } : prev);
                        }}
                        className="ml-1 rounded-full border px-1 hover:bg-muted"
                        aria-label={`Remove ${name}`}
                        title="Remove role"
                      >
                        ×
                      </button>
                    </span>
                  );
                }) : <span className="text-xs text-muted-foreground" style={{display:'inline-block',padding:'2px 0'}}>none</span>}
              </div>
              <div className="font-semibold text-sm mb-1 mt-4">Add Role</div>
              <input
                type="text"
                className="w-full px-2 py-1 border rounded text-sm mb-2 bg-white/60 text-black placeholder:text-gray-400"
                placeholder="Search roles..."
                value={typeof modalRole === 'string' && modalRole ? (roles.find(r => r.roleId === modalRole)?.name || searchRole) : searchRole}
                onChange={e => {
                  setSearchRole(e.target.value);
                  setModalRole("");
                }}
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto mb-3">
                {roles.filter(r =>
                  !selectedUser.roleIds.includes(r.roleId) &&
                  (searchRole === '' || r.name.toLowerCase().includes(searchRole.toLowerCase()) || r.roleId.toLowerCase().includes(searchRole.toLowerCase()))
                ).map(r => (
                  <div
                    key={r.roleId}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${modalRole === r.roleId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setModalRole(r.roleId)}
                  >
                    <span className="truncate text-xs font-medium text-black">{r.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{r.roleId}</span>
                  </div>
                ))}
                {roles.filter(r =>
                  !selectedUser.roleIds.includes(r.roleId) &&
                  (searchRole === '' || r.name.toLowerCase().includes(searchRole.toLowerCase()) || r.roleId.toLowerCase().includes(searchRole.toLowerCase()))
                ).length === 0 && (
                  <div className="text-xs text-gray-400 px-2 py-2">No roles available</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded bg-blue-600 text-white py-1 font-semibold text-xs shadow hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={!modalRole}
                  onClick={async () => {
                    await handleAddRole(selectedUser.discordUserId, modalRole);
                    setSelectedUser((prev) => prev ? { ...prev, roleIds: [...prev.roleIds, modalRole] } : prev);
                    setModalRole("");
                  }}
                >Add</button>
                <button
                  className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition"
                  onClick={() => { setSelectedUser(null); setModalRole(""); }}
                >Cancel</button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
            {!loading && displayedMembers.length === 0 && (
              <tr>
                <td className="py-6 text-muted-foreground text-center" colSpan={3}>
                  {filteredMembers.length === 0 ? "No users found." : "No users in this page."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination info and controls */}
      {!loading && filteredMembers.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Page {page} of {totalPages} • {showingInfo}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              First
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
            >
              Last
            </button>
          </div>
        </div>
      )}
      
      {/* Infinite scroll loader - only show if there are more results */}
      {hasMore && (
        <div ref={loaderRef} className="h-8 flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Scroll to load more...</div>
        </div>
      )}
    </Section>
  );
}
