'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  fetchFeatures, fetchRoles, fetchMembersPaged,
  type Member, type Role, type Features, type MembersPage
} from '../../../lib/api';

export default function MembersPage() {
  const { id: guildId } = useParams<{ id: string }>();

  const [features, setFeatures] = useState<Features>({ custom_groups: false });
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

  useEffect(() => {
    if (!guildId) return;
    let mounted = true;
    (async () => {
      try {
        const [feat, rs] = await Promise.all([
          fetchFeatures(guildId),
          fetchRoles(guildId),
        ]);
        if (!mounted) return;
        setFeatures(feat.features);
        setRoles(rs);

        // first page
        const page = await fetchMembersPaged(guildId, 200, '0');
        if (!mounted) return;
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
      const page = await fetchMembersPaged(guildId, 200, cursor);
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

  const allRoleOptions = useMemo(
    () => roles.map(r => ({ id: r.roleId, name: r.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  const allGroups = useMemo(() => {
    if (!features.custom_groups) return [];
    const s = new Set<string>();
    for (const m of members) for (const g of m.groups || []) s.add(g);
    return Array.from(s).sort();
  }, [members, features]);

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
      if (features.custom_groups && groupFilter) {
        if (!m.groups || !m.groups.includes(groupFilter)) return false;
      }
      return true;
    });
  }, [members, search, roleFilter, groupFilter, features]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!guildId) return <div className="p-6">No guild selected</div>;

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
          {allRoleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        {features.custom_groups && (
          <select
            className="border rounded px-3 py-2 bg-transparent"
            value={groupFilter || ''}
            onChange={e => setGroupFilter(e.target.value || null)}
          >
            <option value="">All groups</option>
            {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        <button
          className="border rounded px-3 py-2"
          onClick={() => { setSearch(''); setRoleFilter(null); setGroupFilter(null); }}
        >
          Clear
        </button>

        <div className="ml-auto flex items-center gap-2">
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
              {features.custom_groups && <th className="text-left px-3 py-2">Groups</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.discordUserId} className="border-t">
                <td className="px-3 py-2">{m.username}</td>
                <td className="px-3 py-2">{m.accountid ?? '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(m.roleIds || []).map(rid => {
                      const name = roleMap.get(rid) || rid;
                      const active = roleFilter === rid;
                      return (
                        <button
                          key={rid}
                          className={`px-2 py-1 rounded border ${active ? 'bg-gray-200 dark:bg-neutral-800' : ''}`}
                          onClick={() => setRoleFilter(active ? null : rid)}
                          title={rid}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </td>
                {features.custom_groups && (
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(m.groups || []).length === 0 ? <span className="text-gray-400">none</span> :
                        (m.groups || []).map(g => {
                          const active = groupFilter === g;
                          return (
                            <button
                              key={g}
                              className={`px-2 py-1 rounded border ${active ? 'bg-gray-200 dark:bg-neutral-800' : ''}`}
                              onClick={() => setGroupFilter(active ? null : g)}
                            >
                              {g}
                            </button>
                          );
                        })}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={features.custom_groups ? 4 : 3} className="px-3 py-6 text-center text-gray-500">
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
