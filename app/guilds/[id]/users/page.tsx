'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import {
  fetchRoles,
  fetchMembersLegacy,
  fetchMembersPaged,
  searchMembers,
  addRole,
  removeRole,
  type Member,
  type Role,
} from '@/lib/api';

function getUserId(session: Session | null): string | undefined {
  const u = session?.user as { id?: string } | undefined;
  return u?.id;
}

export default function UsersPage() {
  const { id: guildId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const myId = getUserId(session);

  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cursor, setCursor] = useState<string | null>('0');
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');

  const [serverResults, setServerResults] = useState<Member[] | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    let mounted = true;
    (async () => {
      try {
        const rs = await fetchRoles(guildId);
        if (!mounted) return;
        setRoles(rs);

        // 1) Legacy first
        let list: Member[] = [];
        try {
          const legacy = await fetchMembersLegacy(guildId);
          if (!mounted) return;
          if (legacy && legacy.length) {
            list = legacy;
            setMembers(list);
            setCursor(null);
            setTotal(legacy.length);
          }
        } catch (e) {
          console.warn('legacy fetch failed', e);
        }

        // 2) Gateway if needed
        if (list.length === 0) {
          try {
            const gw = await fetchMembersPaged(guildId, { all: true, limit: 1000, after: '0', source: 'gateway', debug: true });
            if (!mounted) return;
            if (gw.members?.length) {
              list = gw.members;
              setMembers(list);
              setCursor(gw.page.nextAfter);
              setTotal(gw.page.total);
            }
          } catch (e) {
            console.warn('gateway fetch failed', e);
          }
        }

        // 3) REST if still empty
        if (list.length === 0) {
          try {
            const pg = await fetchMembersPaged(guildId, { all: true, limit: 1000, after: '0', source: 'rest', debug: true });
            if (!mounted) return;
            if (pg.members?.length) {
              list = pg.members;
              setMembers(list);
              setCursor(pg.page.nextAfter);
              setTotal(pg.page.total);
            }
          } catch (e) {
            console.warn('rest fetch failed', e);
          }
        }

        if (list.length === 0) console.error('No members from any source');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [guildId]);

  useEffect(() => {
    if (!guildId) return;
    const q = search.trim();
    if (q.length < 2) {
      setServerResults(null);
      setSearchBusy(false);
      return;
    }
    let abort = false;
    setSearchBusy(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchMembers(guildId, q, 25);
        if (!abort) setServerResults(res);
      } catch {
        if (!abort) setServerResults([]);
      } finally {
        if (!abort) setSearchBusy(false);
      }
    }, 250);
    return () => { abort = true; clearTimeout(t); };
  }, [guildId, search]);

  async function loadMore() {
    if (!guildId || !cursor || loadingMore || serverResults) return;
    setLoadingMore(true);
    try {
      const page = await fetchMembersPaged(guildId, { limit: 100, after: cursor, role: roleFilter || '' });
      setMembers(prev => {
        const byId = new Map(prev.map(m => [m.discordUserId, m]));
        for (const m of page.members) byId.set(m.discordUserId, m);
        return Array.from(byId.values());
      });
      setCursor(page.page.nextAfter);
      setTotal(page.page.total ?? total);
    } finally {
      setLoadingMore(false);
    }
  }

  async function forceGatewayRefresh() {
    if (!guildId) return;
    setLoading(true);
    try {
      const page = await fetchMembersPaged(guildId, { all: true, limit: 1000, after: '0', source: 'gateway', debug: true });
      setMembers(page.members);
      setCursor(page.page.nextAfter);
      setTotal(page.page.total);
      setServerResults(null);
      setSearch('');
      setRoleFilter(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Gateway refresh failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const roleInfo = useMemo(() => {
    const m = new Map<string, { name: string; color: string | null; editable: boolean }>();
    for (const r of roles) m.set(r.roleId, { name: r.name, color: r.color, editable: !!r.editableByBot && !r.managed });
    return m;
  }, [roles]);

  const allRoles = useMemo(
    () => roles
      .filter(r => r.roleId !== String(guildId))
      .map(r => ({ id: r.roleId, name: r.name, color: r.color, editable: !!r.editableByBot && !r.managed }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [roles, guildId]
  );

  const filtered = useMemo(() => {
    const base = serverResults ?? members;
    return base.filter(m => {
      if (roleFilter && !m.roleIds.includes(roleFilter)) return false;
      return true;
    });
  }, [members, serverResults, roleFilter]);

  async function onRemoveRole(userId: string, roleId: string) {
    if (!myId) return alert('No session user id');
    const info = roleInfo.get(roleId);
    if (!info?.editable) return;
    try {
      await removeRole(guildId!, userId, roleId, myId);
      const upd = (arr: Member[]) => arr.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: m.roleIds.filter(r => r !== roleId) } : m
      );
      if (serverResults) setServerResults(upd);
      setMembers(prev => upd(prev));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    }
  }

  async function onAddRole(userId: string, roleId: string) {
    if (!myId) return alert('No session user id');
    const info = roleInfo.get(roleId);
    if (!info?.editable) return;
    try {
      await addRole(guildId!, userId, roleId, myId);
      const upd = (arr: Member[]) => arr.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: Array.from(new Set([...m.roleIds, roleId])) } : m
      );
      if (serverResults) setServerResults(upd);
      setMembers(prev => upd(prev));
      setPickerFor(null);
      setRoleSearch('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!guildId) return <div className="p-6">No guild selected</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Guild: <span className="font-mono">{guildId}</span></span>
          <button className="border rounded px-2 py-1" onClick={forceGatewayRefresh}>Force refresh</button>
          {typeof total === 'number' && !serverResults && (
            <span className="ml-2">Loaded {members.length}{total ? ` / ~${total}` : ''}</span>
          )}
          {serverResults && <span className="ml-2">{searchBusy ? 'Searching…' : `${serverResults.length} result(s)`}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="border rounded px-3 py-2 bg-transparent"
          placeholder="Search username or discord id"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 bg-transparent"
          value={roleFilter || ''}
          onChange={e => setRoleFilter(e.target.value || null)}
          disabled={!!serverResults}
        >
          <option value="">All roles</option>
          {allRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button className="border rounded px-3 py-2" onClick={() => { setSearch(''); setServerResults(null); setRoleFilter(null); }}>
          Clear
        </button>
        <div className="ml-auto">
          <button className="border rounded px-3 py-2" onClick={loadMore} disabled={!cursor || loadingMore || !!serverResults}>
            {loadingMore ? 'Loading…' : (cursor ? 'Load more' : 'No more')}
          </button>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900">
            <tr>
              <th className="text-left px-3 py-2">Discord</th>
              <th className="text-left px-3 py-2">Roles</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const pickerOpen = pickerFor === m.discordUserId;
              const availableRoles = allRoles
                .filter(r => r.editable)
                .filter(r => !m.roleIds.includes(r.id))
                .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));

              return (
                <tr key={m.discordUserId} className="border-t align-top">
                  <td className="px-3 py-2">{m.username}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.roleIds || []).map(rid => {
                        const info = roleInfo.get(rid);
                        const name = info?.name || rid;
                        const color = info?.color || null;
                        const editable = info?.editable ?? false;
                        return (
                          <span key={rid} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color || '#999' }} />
                            <span>{name}</span>
                            {editable && (
                              <button
                                className="ml-1 rounded-full px-1 leading-none text-xs opacity-70 hover:opacity-100"
                                title="Remove role"
                                onClick={() => onRemoveRole(m.discordUserId, rid)}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        );
                      })}
                      <button
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                        title="Add role"
                        onClick={() => setPickerFor(pickerOpen ? null : m.discordUserId)}
                      >
                        <span className="h-2 w-2 rounded-full" />
                        <span>Add</span>
                        <span className="ml-1">＋</span>
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
                              <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color || '#999' }} />
                                {r.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={2} className="px-3 py-6 text-center text-gray-500">No users. Click “Force refresh”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
