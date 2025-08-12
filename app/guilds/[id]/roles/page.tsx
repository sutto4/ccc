'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import {
  fetchRoles,
  fetchMembersPaged,
  fetchMembersLegacy,
  searchMembers,
  addRole,
  removeRole,
  type Role,
  type Member,
} from '@/lib/api';

function getUserId(session: Session | null): string | undefined {
  const u = session?.user as { id?: string } | undefined;
  return u?.id;
}

type RoleChip = { id: string; name: string; color: string | null; editable: boolean };

export default function RolesPage() {
  const { id: guildId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const myId = getUserId(session);

  const [roles, setRoles] = useState<Role[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [userFilter, setUserFilter] = useState('');
  const [addingOpen, setAddingOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addResults, setAddResults] = useState<Member[]>([]);

  // Load roles
  useEffect(() => {
    if (!guildId) return;
    let alive = true;
    (async () => {
      try {
        const rs = await fetchRoles(guildId);
        if (!alive) return;
        setRoles(rs);
        // Pick first non-@everyone role, or first
        const pick =
          rs.find(r => r.roleId !== String(guildId))?.roleId ||
          rs[0]?.roleId ||
          null;
        setSelectedRoleId(pick);
      } finally {
        if (alive) setLoadingRoles(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId]);

  // Load members for selected role
  useEffect(() => {
    if (!guildId || !selectedRoleId) return;
    let alive = true;
    (async () => {
      setLoadingMembers(true);
      try {
        // Try gateway first for freshness
        let page = await fetchMembersPaged(guildId, {
          all: true,
          limit: 1000,
          after: '0',
          role: selectedRoleId,
          source: 'gateway',
        });
        let list = page.members;

        // REST fallback
        if (list.length === 0) {
          page = await fetchMembersPaged(guildId, {
            all: true,
            limit: 1000,
            after: '0',
            role: selectedRoleId,
            source: 'rest',
          });
          list = page.members;
        }

        // Legacy fallback (filter client side)
        if (list.length === 0) {
          const legacy = await fetchMembersLegacy(guildId);
          list = legacy.filter(m => m.roleIds.includes(selectedRoleId));
        }

        if (!alive) return;
        setMembers(list);
      } finally {
        if (alive) setLoadingMembers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId, selectedRoleId]);

  // Search for users to add
  useEffect(() => {
    if (!guildId || !addingOpen) return;
    const q = addQuery.trim();
    if (q.length < 2) {
      setAddResults([]);
      setAddBusy(false);
      return;
    }
    let cancel = false;
    setAddBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchMembers(guildId, q, 25);
        if (!cancel) setAddResults(res);
      } finally {
        if (!cancel) setAddBusy(false);
      }
    }, 250);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [guildId, addingOpen, addQuery]);

  const roleChips: RoleChip[] = useMemo(() => {
    return roles
      .filter(r => r.name.toLowerCase().includes(roleFilter.toLowerCase()))
      .map(r => ({
        id: r.roleId,
        name: r.name,
        color: r.color,
        editable: !!r.editableByBot && !r.managed && r.roleId !== String(guildId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roles, roleFilter, guildId]);

  const selectedRole: RoleChip | undefined = useMemo(
    () => roleChips.find(r => r.id === selectedRoleId),
    [roleChips, selectedRoleId]
  );

  const visibleMembers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    const base = members.slice().sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    if (!q) return base;
    return base.filter(
      m =>
        (m.username || '').toLowerCase().includes(q) ||
        String(m.discordUserId || '').includes(q) ||
        String(m.accountid || '').includes(q)
    );
  }, [members, userFilter]);

  async function onRemoveUser(userId: string) {
    if (!guildId || !selectedRoleId) return;
    if (!myId) {
      alert('No session user id');
      return;
    }
    try {
      await removeRole(guildId, userId, selectedRoleId, myId);
      setMembers(prev => prev.filter(m => m.discordUserId !== userId));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    }
  }

  async function onAddUser(user: Member) {
    if (!guildId || !selectedRoleId) return;
    if (!myId) {
      alert('No session user id');
      return;
    }
    try {
      await addRole(guildId, user.discordUserId, selectedRoleId, myId);
      // If user already shown, skip. Otherwise add.
      setMembers(prev => {
        if (prev.some(m => m.discordUserId === user.discordUserId)) return prev;
        // append with role applied
        const clone: Member = {
          ...user,
          roleIds: Array.from(new Set([...(user.roleIds || []), selectedRoleId])),
        };
        return [...prev, clone].sort((a, b) => (a.username || '').localeCompare(b.username || ''));
      });
      setAddQuery('');
      setAddResults([]);
      setAddingOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    }
  }

  if (loadingRoles) return <div className="p-6">Loading roles...</div>;
  if (!guildId) return <div className="p-6">No guild selected</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 bg-transparent"
            placeholder="Search roles"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Roles list as chips */}
      <div className="flex flex-wrap gap-2 border rounded p-3">
        {roleChips.length === 0 && <span className="text-sm text-gray-500">No roles</span>}
        {roleChips.map(r => {
          const active = r.id === selectedRoleId;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                active ? 'bg-gray-100 dark:bg-neutral-900' : ''
              }`}
              title={r.name}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color || '#999' }} />
              <span className="truncate max-w-[16ch]">{r.name}</span>
              {!r.editable && <span className="text-[10px] uppercase border rounded px-1">view</span>}
            </button>
          );
        })}
      </div>

      {/* Selected role header + actions */}
      {selectedRoleId && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedRole?.color || '#999' }} />
            <div className="text-lg font-medium">{selectedRole?.name || 'Role'}</div>
            {!selectedRole?.editable && (
              <span className="text-xs border rounded px-2 py-0.5">not editable by bot</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              className="border rounded px-3 py-2 bg-transparent"
              placeholder="Filter users"
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
            />
            <button
              className="border rounded px-3 py-2"
              onClick={() => setAddingOpen(v => !v)}
              disabled={!selectedRole?.editable}
              title={selectedRole?.editable ? 'Add user to role' : 'Role not editable by bot'}
            >
              {addingOpen ? 'Close' : 'Add user'}
            </button>
          </div>
        </div>
      )}

      {/* Add user panel */}
      {addingOpen && selectedRoleId && (
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm text-muted-foreground">
            Search by username or ID. Only users not shown in the list will be offered.
          </div>
          <input
            className="border rounded px-3 py-2 w-full bg-transparent"
            placeholder="Type at least 2 characters"
            value={addQuery}
            onChange={e => setAddQuery(e.target.value)}
          />
          <div className="max-h-64 overflow-auto space-y-1">
            {addBusy && <div className="text-sm px-1 py-2">Searching...</div>}
            {!addBusy && addQuery.trim().length >= 2 && addResults.length === 0 && (
              <div className="text-sm px-1 py-2 text-gray-500">No matches</div>
            )}
            {addResults
              .filter(r => !members.some(m => m.discordUserId === r.discordUserId))
              .map(r => (
                <div key={r.discordUserId} className="flex items-center justify-between gap-2 border rounded px-2 py-1">
                  <div className="truncate">
                    <div className="font-medium truncate">{r.username}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.discordUserId}</div>
                  </div>
                  <button
                    className="border rounded px-2 py-1 text-sm"
                    onClick={() => onAddUser(r)}
                    disabled={!selectedRole?.editable}
                    title={selectedRole?.editable ? 'Add to role' : 'Role not editable'}
                  >
                    Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Members list as chips */}
      <div className="border rounded p-3">
        {loadingMembers && <div>Loading users...</div>}
        {!loadingMembers && visibleMembers.length === 0 && (
          <div className="text-sm text-gray-500">No users in this role.</div>
        )}
        <div className="flex flex-wrap gap-2">
          {visibleMembers.map(m => (
            <span
              key={m.discordUserId}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              title={m.discordUserId}
            >
              <span className="truncate max-w-[24ch]">{m.username}</span>
              {selectedRole?.editable && (
                <button
                  className="ml-1 rounded-full px-1 leading-none text-xs opacity-70 hover:opacity-100"
                  title="Remove from role"
                  onClick={() => onRemoveUser(m.discordUserId)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
