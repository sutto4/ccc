'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { fetchRoles, fetchMembersPaged, addRole, removeRole, type Member, type Role } from '../../../lib/api';

export default function UsersPage() {
  const { id: guildId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const myId = (session as any)?.user?.id as string | undefined;

  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cursor, setCursor] = useState<string | null>('0');
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // role picker
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');

  useEffect(() => {
    if (!guildId) return;
    let mounted = true;
    (async () => {
      try {
        const [rs, page] = await Promise.all([
          fetchRoles(guildId),
          fetchMembersPaged(guildId, { limit: 100, after: '0' })
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
      const page = await fetchMembersPaged(guildId, { limit: 100, after: cursor, q: search, role: roleFilter || '' });
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

  const roleName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of roles) m.set(r.roleId, r.name);
    return m;
  }, [roles]);

  const roleColor = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const r of roles) m.set(r.roleId, r.color);
    return m;
  }, [roles]);

  const allRoles = useMemo(
    () => roles.map(r => ({ id: r.roleId, name: r.name, color: r.color })).sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  const filtered = useMemo(() => {
    return members.filter(m => {
      if (search) {
        const q = search.toLowerCase();
        const hit = (m.username || '').toLowerCase().includes(q) || String(m.discordUserId || '').includes(q);
        if (!hit) return false;
      }
      if (roleFilter && !m.roleIds.includes(roleFilter)) return false;
      return true;
    });
  }, [members, search, roleFilter]);

  async function onRemoveRole(userId: string, roleId: string) {
    if (!myId) return alert('No session user id');
    try {
      await removeRole(guildId!, userId, roleId, myId);
      setMembers(prev => prev.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: m.roleIds.filter(r => r !== roleId) } : m
      ));
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  }

  async function onAddRole(userId: string, roleId: string) {
    if (!myId) return alert('No session user id');
    try {
      await addRole(guildId!, userId, roleId, myId);
      setMembers(prev => prev.map(m =>
        m.discordUserId === userId ? { ...m, roleIds: Array.from(new Set([...m.roleIds, roleId])) } : m
      ));
      setPickerFor(null);
      setRoleSearch('');
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!guildId) return <div className="p-6">No guild selected</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="text-sm text-gray-500">
          Guild: <span className="font-mono">{guildId}</span>{' '}
          {typeof total === 'number' && <span className="ml-2">Loaded {members.length}{total ? ` / ~${total}` : ''}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="border rounded px-3 py-2 bg-transparent" placeholder="Search username or discord id"
               value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded px-3 py-2 bg-transparent" value={roleFilter || ''}
                onChange={e => setRoleFilter(e.target.value || null)}>
          <option value="">All roles</option>
          {allRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button className="border rounded px-3 py-2" onClick={() => { setSearch(''); setRoleFilter(null); }}>Clear</button>
        <div className="ml-auto">
          <button className="border rounded px-3 py-2" onClick={loadMore} disabled={!cursor || loadingMore}>
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
                .filter(r => !m.roleIds.includes(r.id))
                .filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));

              return (
                <tr key={m.discordUserId} className="border-t align-top">
                  <td className="px-3 py-2">{m.username}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.roleIds || []).map(rid => {
                        const name = roleName.get(rid) || rid;
                        const color = roleColor.get(rid) || null;
                        return (
                          <span key={rid} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color || '#999' }} />
                            <span>{name}</span>
                            <button
                              className="ml-1 rounded-full px-1 leading-none text-xs opacity-70 hover:opacity-100"
                              title="Remove role"
                              onClick={() => onRemoveRole(m.discordUserId, rid)}
                            >
                              ×
                            </button>
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
                        <input className="border rounded px-2 py-1 w-full mb-2 bg-transparent" placeholder="Search roles…"
                               value={roleSearch} onChange={e => setRoleSearch(e.target.value)} />
                        <div className="max-h-48 overflow-auto space-y-1">
                          {availableRoles.length === 0 && <div className="text-gray-500 text-sm">No roles</div>}
                          {availableRoles.map(r => (
                            <button key={r.id}
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
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-gray-500">No matches</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
