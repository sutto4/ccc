'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  fetchFeatures, fetchRoles, fetchMembersPaged,
  addRole, removeRole,
  type Member, type Role, type Features
} from '../../../lib/api';

export default function MembersPage() {
  const { id: guildId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const myId = (session as any)?.user?.id as string | undefined;

  const [features, setFeatures] = useState<Features>({ custom_groups: false, premium_members: false });
  const premium = Boolean(features.premium_members || features.custom_groups);

  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cursor, setCursor] = useState<string | null>('0');
  const [total, setTotal] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  // role picker state
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');

  useEffect(() => {
    if (!guildId) return;
    let mounted = true;
    (async () => {
      try {
        const feat = await fetchFeatures(guildId);
        if (!mounted) return;
        setFeatures(feat.features || { custom_groups: false, premium_members: false });

        if (!feat.features?.premium_members && !feat.features?.custom_groups) {
          return; // no premium, do not load heavy data
        }

        const [rs, page] = await Promise.all([
          fetchRoles(guildId),
          fetchMembersPaged(guildId, { limit: 200, after: '0' }),
        ]);
        if (!mounted) return;
        setRoles(rs);
        setMembers(page.members);
        setCursor(page.page.nextAfter);
        setTotal(page.page.total);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [guildId]);

  async function loadMore() {
    if (!guildId || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchMembersPaged(guildId, {
        limit: 200, after: cursor, q: search, role: roleFilter || '', group: groupFilter || ''
      });
      setMembers(prev => {
        const byId = new Map(prev.map(m => [m.discordUserId, m]));
        for (const m of page.members) byId.set(m.discordUserId, m);
        return Array.from(byId.values());
      });
      setCursor(page.page.nextAfter);
      setTotal(page.page.total ?? total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }

  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of roles) m.set(r.roleId, r.name);
    return m;
  }, [roles]);

  const allRoles = useMemo(
    () => roles.map(r => ({ id: r.roleId, name: r.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  const allGroups = useMemo(() => {
    if (!premium) return [];
    const s = new Set<string>();
    for (const m of members) for (const g of m.groups || []) s.add(g);
    return Array.from(s).sort();
  }, [members, premium]);

  const filtered = useMemo(() => {
    return members.filter(m => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          (m.username || '').toLowerCase().includes(q) ||
          String(m.discordUserId || '').includes(q) ||
          String(m.accountid || '').includes(q);
        if (!hit) return false;
      }
      if (roleFilter && !m.roleIds.includes(roleFilter)) return false;
      if (premium && groupFilter) {
        if (!m.groups || !m.groups.includes(groupFilter)) return false;
      }
      return true;
    });
  }, [members, search, roleFilter, groupFilter, premium]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!premium) {
    return (
      <div className="p-6 border rounded">
        <h2 className="text-xl font-semibold">Members is a premium feature</h2>
        <p className="text-sm text-muted-foreground mt-2">Upgrade to manage roles, see AccountID and custom groups.</p>
      </div>
    );
  }
  if (!guildId) return <div className="p-6">No guild selected</div>;

  async function onRemoveRole(userId: string, roleId: string) {
    if (!myId) return alert('No session user id');
    try {
      await removeRole(guildId, userId, roleId, myId);
      setMembers(prev => prev.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: m.roleIds.filter(r => r !== roleId) } : m
      ));
    } catch (e: any) {
      alert(`Remove failed: ${e?.message || e}`);
    }
  }

  async function onAddRole(userId: string, roleId: string) {
    if (!myId) return alert('No session user id');
    try {
      await addRole(guildId, userId, roleId, myId);
      setMembers(prev => prev.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: Array.from(new Set([...m.roleIds, roleId])) } : m
      ));
      setPickerFor(null);
      setRoleSearch('');
    } catch (e: any) {
      alert(`Add failed: ${e?.message || e}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <div className="text-sm text-gray-500">
          Guild: <span className="font-mono">{guildId}</span>{' '}
          {typeof total === 'number' && (
            <span className="ml-2">Loaded {members.length}{total ? ` / ~${total}` : ''}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="border rounded px-3 py-2 bg-transparent"
          placeholder="Search username, discord id, or accountid"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="border rounded px-3 py-2 bg-transparent"
          value={roleFilter || ''}
          onChange={e => setRoleFilter(e.target.value || null)}
        >
          <option value="">All roles</option>
          {allRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <select
          className="border rounded px-3 py-2 bg-transparent"
          value={groupFilter || ''}
          onChange={e => setGroupFilter(e.target.value || null)}
        >
          <option value="">All groups</option>
          {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        <button
          className="border rounded px-3 py-2"
          onClick={() => { setSearch(''); setRoleFilter(null); setGroupFilter(null); }}
        >
          Clear
        </button>

        <div className="ml-auto">
          <button
            className="border rounded px-3 py-2"
            onClick={loadMore}
            disabled={!cursor || loadingMore}
            title={!cursor ? 'No more' : 'Load next page'}
          >
            {loadingMore ? 'Loading…' : (cursor ? 'Load more' : 'No more')}
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900">
            <tr>
              <th className="text-left px-3 py-2">Discord</th>
              <th className="text-left px-3 py-2">AccountID</th>
              <th className="text-left px-3 py-2">Roles</th>
              <th className="text-left px-3 py-2">Groups</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const pickerOpen = pickerFor === m.discordUserId;
              const availableRoles = allRoles
                .filter(r => !m.roleIds.includes(r.id))
                .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));

              return (
                <tr key={m.discordUserId} className="border-t align-top">
                  <td className="px-3 py-2">{m.username}</td>
                  <td className="px-3 py-2">{m.accountid ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.roleIds || []).map(rid => {
                        const name = roleMap.get(rid) || rid;
                        return (
                          <span key={rid} className="inline-flex items-center gap-1 px-2 py-1 rounded border">
                            <span>{name}</span>
                            <button
                              className="text-xs opacity-70 hover:opacity-100"
                              title="Remove role"
                              onClick={() => onRemoveRole(m.discordUserId, rid)}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                      <button
                        className="px-2 py-1 rounded border"
                        title="Add role"
                        onClick={() => setPickerFor(pickerOpen ? null : m.discordUserId)}
                      >
                        +
                      </button>
                    </div>

                    {pickerOpen && (
                      <div className="mt-2 p-3 border rounded bg-background">
                        <input
                          className="border rounded px-2 py-1 w-full mb-2 bg-transparent"
                          placeholder="Search roles…"
                          value={roleSearch}
                          onChange={e => setRoleSearch(e.target.value)}
                        />
                        <div className="max-h-48 overflow-auto space-y-1">
                          {availableRoles.length === 0 && <div className="text-gray-500 text-sm">No roles</div>}
                          {availableRoles.map(r => (
                            <button
                              key={r.id}
                              className="w-full text-left px-2 py-1 rounded border hover:bg-gray-50 dark:hover:bg-neutral-800"
                              onClick={() => onAddRole(m.discordUserId, r.id)}
                            >
                              {r.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.groups || []).length === 0 ? <span className="text-gray-400">none</span> :
                        (m.groups || []).map(g => (
                          <span key={g} className="px-2 py-1 rounded border">{g}</span>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No matches
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
