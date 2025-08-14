"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleChips } from "@/components/ui/role-chips";
import { GroupChips } from "@/components/ui/group-chips";
import { UserRolesOnDemand } from "@/components/ui/user-roles-on-demand";
import { Dialog } from "@headlessui/react";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import {
  fetchMembersLegacy,
  fetchRoles,
  addRole,
  removeRole,
  type Member,
  type Role,
} from "@/lib/api";
import { useSession } from "next-auth/react";

type Row = Member & { rolesExpanded?: boolean; groupsExpanded?: boolean; avatarUrl: string };

export default function MembersPage() {
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);
  const [modalRole, setModalRole] = useState<string>("");
  const [view, setView] = useState<'card' | 'table'>('card');
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Removed: add role modal state for card view
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
      } catch (e: any) {
        setError(e?.message || "failed");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId]);

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.roleId, r])), [roles]);
  const availableRolesFor = (row: Row) =>
    roles.filter(
      (r) =>
        !row.roleIds.includes(r.roleId) &&
        r.roleId !== guildId &&
        (r as any).managed !== true &&
        (r as any).editableByBot !== false
    );

  // Collect all unique groups for filter dropdown
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => (m.groups || []).forEach(g => set.add(g)));
    return Array.from(set).sort();
  }, [members]);

  // Filtered members
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

  async function handleAddRole(userId: string, roleId: string) {
    try {
      const actor = (session?.user as any)?.id || "";
      await addRole(guildId, userId, roleId, actor);
      setMembers((prev) =>
        prev.map((m) =>
          m.discordUserId === userId ? { ...m, roleIds: [...m.roleIds, roleId] } : m
        )
      );
    } catch (e: any) {
      alert(`Add failed: ${e?.message || "unknown"}`);
    }
  }

  async function handleRemoveRole(userId: string, roleId: string) {
    try {
      const actor = (session?.user as any)?.id || "";
      await removeRole(guildId, userId, roleId, actor);
      setMembers((prev) =>
        prev.map((m) =>
          m.discordUserId === userId
            ? { ...m, roleIds: m.roleIds.filter((r) => r !== roleId) }
            : m
        )
      );
    } catch (e: any) {
      alert(`Remove failed: ${e?.message || "unknown"}`);
    }
  }

  return (
    <Section
      title="Members"
      right={
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${members.length.toLocaleString()} members`}
          </div>
          <button
            className={`px-3 py-1 rounded font-medium border text-xs transition-colors ${view === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('card')}
            type="button"
          >
            Card View
          </button>
          <button
            className={`px-3 py-1 rounded font-medium border text-xs transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setView('table')}
            type="button"
          >
            Table View
          </button>
        </div>
      }
    >
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <div className="flex-1">
          <input
            type="text"
            className="w-full px-2 py-1 border rounded text-sm"
            placeholder="Search members by name, account ID, or Discord ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All Discord Roles</option>
            {roles.map(r => (
              <option key={r.roleId} value={r.roleId}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
          >
            <option value="">All Groups</option>
            {allGroups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {view === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {!loading && filteredMembers.map((m) => (
            <div
              key={m.discordUserId}
              className="bg-card border rounded-xl p-4 flex flex-col items-center shadow-md relative hover:shadow-lg transition-shadow cursor-pointer hover:bg-primary/10"
              onClick={() => setSelectedUser(m)}
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
              {/* Discord Roles */}
              <div className="w-full mb-1">
                <div className="text-xs font-semibold text-muted-foreground mb-0.5 text-center">Discord Roles</div>
                <div className="flex flex-wrap items-center gap-1 justify-center">
                  {(m.roleIds.length > 0
                    ? (m.rolesExpanded ? m.roleIds : m.roleIds.slice(0, 3)).map((rid) => {
                        const r = roleMap.get(rid);
                        const name = r?.name ?? "unknown";
                        const color = r?.color || null;
                        const uneditable =
                          rid === guildId || (r as any)?.managed === true || (r as any)?.editableByBot === false;
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
                            {/* Remove button only in modal now */}
                          </span>
                        );
                      })
                    : <span className="text-xs text-muted-foreground">none</span>
                  )}
                  {m.roleIds.length > 3 && (
                    <button
                      className="ml-2 text-xs underline text-muted-foreground hover:text-foreground"
                      onClick={() => setMembers(prev => prev.map(mem => mem.discordUserId === m.discordUserId ? { ...mem, rolesExpanded: !mem.rolesExpanded } : mem))}
                    >
                      {m.rolesExpanded ? 'Show less' : `+${m.roleIds.length - 3} more`}
                    </button>
                  )}
                </div>
              </div>
              {/* Divider */}
              <div className="w-full flex items-center my-1">
                <div className="flex-1 border-t border-muted" />
                <span className="mx-2 text-xs text-muted-foreground">Custom Groups</span>
                <div className="flex-1 border-t border-muted" />
              </div>
              {/* Custom Groups */}
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
                    onClick={() => setMembers(prev => prev.map(mem => mem.discordUserId === m.discordUserId ? { ...mem, groupsExpanded: !mem.groupsExpanded } : mem))}
                  >
                    {m.groupsExpanded ? 'Show less' : `+${m.groups!.length - 3} more`}
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && filteredMembers.length === 0 && (
            <div className="py-6 text-muted-foreground col-span-full text-center">
              No members.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-xl bg-card">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-2 text-left text-xs font-semibold">Avatar</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Username</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Account ID</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Discord Roles</th>
                <th className="px-3 py-2 text-left text-xs font-semibold">Custom Groups</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr
                  key={m.discordUserId}
                  className="border-b last:border-0 cursor-pointer transition hover:bg-primary/10 hover:shadow-md"
                  onClick={() => setSelectedUser(m)}
                >
                  <td className="px-3 py-2">
                    <img
                      src={m.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt={m.username}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full border bg-muted object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{m.username}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.accountid ?? <span className='text-muted-foreground'>—</span>}</td>
                  <td className="px-3 py-2 text-xs min-w-[160px]">
                    <RoleChips roleIds={m.roleIds} roleMap={roleMap} max={3} />
                  </td>
                  <td className="px-3 py-2 text-xs min-w-[120px]">
                    <GroupChips groups={m.groups} max={3} />
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-sm text-muted-foreground text-center py-4">No members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Modal for add/remove roles */}
      {selectedUser && (
        <Dialog open={true} onClose={() => { setSelectedUser(null); setModalRole(""); }} className="fixed z-[200] inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/10" aria-hidden="true" onClick={() => { setSelectedUser(null); setModalRole(""); }} />
          <div
            className="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-auto z-10 backdrop-blur-md border border-gray-200"
            style={{
              background: 'rgba(255,255,255,0.35)',
              color: '#111827',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)'
            }}
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
                  const uneditable =
                    rid === guildId || (r as any)?.managed === true || (r as any)?.editableByBot === false;
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
                          await handleRemoveRole(selectedUser.discordUserId, rid);
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
                }) : <span className="text-xs text-muted-foreground">none</span>}
              </div>
              <div className="font-semibold text-sm mb-1 mt-4">Add Role</div>
              <input
                type="text"
                className="w-full px-2 py-1 border rounded text-sm mb-2 bg-white/60 text-black placeholder:text-gray-400"
                placeholder="Search roles..."
                value={modalRole ? roles.find(r => r.roleId === modalRole)?.name || '' : ''}
                onChange={e => {
                  const val = e.target.value.toLowerCase();
                  const found = roles.filter(r => !selectedUser.roleIds.includes(r.roleId)).find(r => r.name.toLowerCase().includes(val));
                  setModalRole(found ? found.roleId : "");
                }}
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto mb-3">
                {roles.filter(r => !selectedUser.roleIds.includes(r.roleId)).map(r => (
                  <div
                    key={r.roleId}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${modalRole === r.roleId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setModalRole(r.roleId)}
                  >
                    <span className="truncate text-xs font-medium text-black">{r.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{r.roleId}</span>
                  </div>
                ))}
                {roles.filter(r => !selectedUser.roleIds.includes(r.roleId)).length === 0 && (
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
    </Section>
  );
}
