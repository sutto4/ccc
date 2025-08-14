"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { logAction } from "@/lib/logger";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import { fetchMembersLegacy, fetchRoles, addRole, removeRole, type Member, type Role } from "@/lib/api";
import { UserRoleModal } from "@/components/ui/user-role-modal";

type Row = Member & { rolesExpanded?: boolean; groupsExpanded?: boolean; avatarUrl: string };

export default function MembersPage() {
  const { data: session } = useSession();
  const [modalUser, setModalUser] = useState<Row | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');
  const [groupSearch, setGroupSearch] = useState("");
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [m, r] = await Promise.all([fetchMembersLegacy(guildId), fetchRoles(guildId)]);
        if (!alive) return;
        setMembers(m.map((mem: any) => ({
          ...mem,
          avatarUrl: typeof mem.avatarUrl === "string" && mem.avatarUrl ? mem.avatarUrl : "https://cdn.discordapp.com/embed/avatars/0.png",
          groups: Array.isArray(mem.groups) ? mem.groups : [],
        })));
        setRoles(r);
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [guildId]);

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.roleId, r])), [roles]);
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch =
        !search ||
        m.username.toLowerCase().includes(search.toLowerCase()) ||
        (m.accountid && m.accountid.toLowerCase().includes(search.toLowerCase())) ||
        (m.discordUserId && m.discordUserId.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = !roleFilter || m.roleIds.includes(roleFilter);
      const matchesGroup = !groupFilter || (m.groups && m.groups.includes(groupFilter));
      return matchesSearch && matchesRole && matchesGroup;
    });
  }, [members, search, roleFilter, groupFilter]);

  // Gather all unique custom groups
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => m.groups?.forEach(g => set.add(g)));
    return Array.from(set);
  }, [members]);

  // Filtered groups by search
  const filteredGroups = useMemo(() => {
    if (!groupSearch) return allGroups;
    return allGroups.filter(g => g.toLowerCase().includes(groupSearch.toLowerCase()));
  }, [allGroups, groupSearch]);

  // Add role to user
  async function handleAddRole(userId: string, roleId: string) {
    const actor = (session?.user as any)?.id || "";
    const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
    const user = members.find(m => m.discordUserId === userId);
    const role = roles.find(r => r.roleId === roleId);
    // Call API to persist
    await addRole(guildId, userId, roleId, actor);
    setMembers(prev => {
      const updated = prev.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: [...m.roleIds, roleId] } : m
      );
      // If modal is open for this user, update modalUser
      if (modalUser && modalUser.discordUserId === userId) {
        const updatedUser = updated.find(m => m.discordUserId === userId);
        if (updatedUser) setModalUser(updatedUser);
      }
      return updated;
    });
    // Logging
    await logAction({
      guildId,
      userId: actor,
      user: { id: actor, username: actorUsername },
      actionType: "role.add",
      actionData: {
        targetUserId: userId,
        targetUsername: user?.username,
        roleId,
        roleName: role?.name,
      },
    });
  }
  // Remove role from user
  async function handleRemoveRole(userId: string, roleId: string) {
    const actor = (session?.user as any)?.id || "";
    const actorUsername = (session?.user as any)?.name || (session?.user as any)?.username || actor;
    const user = members.find(m => m.discordUserId === userId);
    const role = roles.find(r => r.roleId === roleId);
    // Call API to persist
    await removeRole(guildId, userId, roleId, actor);
    setMembers(prev => {
      const updated = prev.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: m.roleIds.filter(r => r !== roleId) } : m
      );
      // If modal is open for this user, update modalUser
      if (modalUser && modalUser.discordUserId === userId) {
        const updatedUser = updated.find(m => m.discordUserId === userId);
        if (updatedUser) setModalUser(updatedUser);
      }
      return updated;
    });
    // Logging
    await logAction({
      guildId,
      userId: actor,
      user: { id: actor, username: actorUsername },
      actionType: "role.remove",
      actionData: {
        targetUserId: userId,
        targetUsername: user?.username,
        roleId,
        roleName: role?.name,
      },
    });
  }

  return (
    <Section title="Members">


      {/* Search and view toggles */}
      <div className="flex items-center gap-2 mb-4">
        <input
          className="w-full max-w-xs rounded border px-3 py-2 text-sm"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex-1" />
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('card')}
          >
            Card View
          </button>
          <button
            className={`px-3 py-1 rounded font-medium border text-sm transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('table')}
          >
            Table View
          </button>
        </div>
      </div>
      {view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {!loading && filteredMembers.map((m) => (
            // ...existing card view code...
            <div
              key={m.discordUserId}
              className="bg-card border rounded-xl p-4 flex flex-col items-center shadow-md relative hover:shadow-lg transition-shadow cursor-pointer hover:bg-primary/10"
              onClick={() => setModalUser(m)}
            >
              <img
                src={m.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                alt={m.username}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full border bg-muted object-cover mb-2"
                referrerPolicy="no-referrer"
              />
              <div className="font-semibold text-center truncate w-full" title={m.username}>{m.username}</div>
              <div className="font-mono text-xs text-muted-foreground truncate w-full text-center mb-1" title={m.accountid ?? undefined}>{m.accountid ?? <span className='text-muted-foreground'>—</span>}</div>
              <div className="w-full mb-1">
                <div className="text-xs font-semibold text-muted-foreground mb-0.5 text-center">Discord Roles</div>
                <div className="flex flex-wrap items-center gap-1 justify-center">
                  {(m.roleIds.length > 0
                    ? (m.rolesExpanded ? m.roleIds : m.roleIds.slice(0, 3)).map((rid) => {
                        const r = roleMap.get(rid);
                        const name = r?.name ?? "unknown";
                        const color = r?.color || null;
                        return (
                          <span
                            key={rid}
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                            style={{
                              backgroundColor: color ? `${color}20` : undefined,
                              borderColor: color || undefined,
                            }}
                            title={rid}
                          >
                            {name}
                          </span>
                        );
                      })
                    : <span className="text-xs text-muted-foreground">none</span>
                  )}
                  {m.roleIds.length > 3 && (
                    <button
                      className="ml-2 text-xs underline text-muted-foreground hover:text-foreground"
                      onClick={e => {
                        e.stopPropagation();
                        setMembers(prev => prev.map(mem => mem.discordUserId === m.discordUserId ? { ...mem, rolesExpanded: !mem.rolesExpanded } : mem));
                      }}
                    >
                      {m.rolesExpanded ? 'Show less' : `+${m.roleIds.length - 3} more`}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full flex items-center my-1">
                <div className="flex-1 border-t border-muted" />
                <span className="mx-2 text-xs text-muted-foreground">Custom Groups</span>
                <div className="flex-1 border-t border-muted" />
              </div>
              <div className="flex flex-wrap items-center gap-1 justify-center w-full mb-1">
                {((m.groups!.length > 0)
                  ? (m.groupsExpanded ? m.groups! : m.groups!.slice(0, 3)).map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
                      >
                        {g}
                      </span>
                    ))
                  : <span className="text-xs text-muted-foreground">none</span>
                )}
                {m.groups!.length > 3 && (
                  <button
                    className="ml-2 text-xs underline text-muted-foreground hover:text-foreground"
                    onClick={e => {
                      e.stopPropagation();
                      setMembers(prev => prev.map(mem => mem.discordUserId === m.discordUserId ? { ...mem, groupsExpanded: !mem.groupsExpanded } : mem));
                    }}
                  >
                    {m.groupsExpanded ? 'Show less' : `+${m.groups!.length - 3} more`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full divide-y divide-border text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-semibold">User</th>
                <th className="px-3 py-2 text-left font-semibold">Account ID</th>
                <th className="px-3 py-2 text-left font-semibold">Roles</th>
                <th className="px-3 py-2 text-left font-semibold">Groups</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredMembers.map((m) => (
                <tr
                  key={m.discordUserId}
                  className="border-b last:border-0 cursor-pointer transition hover:bg-primary/10 hover:shadow-md"
                  onClick={() => setModalUser(m)}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={m.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
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
                    {m.accountid ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {m.roleIds.map((rid) => {
                        const r = roleMap.get(rid);
                        const name = r?.name ?? 'unknown';
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
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {m.groups && m.groups.length > 0 ? m.groups.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground border border-muted-foreground/20 max-w-[120px] truncate"
                        >
                          {g}
                        </span>
                      )) : <span className="text-xs text-muted-foreground">none</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredMembers.length === 0 && (
                <tr>
                  <td className="py-6 text-muted-foreground text-center" colSpan={4}>
                    No users.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {modalUser && (
        <UserRoleModal
          open={!!modalUser}
          onClose={() => setModalUser(null)}
          user={modalUser}
          allRoles={roles}
          onAddRole={(roleId) => handleAddRole(modalUser.discordUserId, roleId)}
          onRemoveRole={(roleId) => handleRemoveRole(modalUser.discordUserId, roleId)}
        />
      )}
    </Section>
  );
}
