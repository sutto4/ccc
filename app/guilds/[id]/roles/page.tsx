'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchRoles, type Role } from '@/lib/api';

export default function RolesPage() {
  const { id: guildId } = useParams<{ id: string }>();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!guildId) return;
    let alive = true;
    (async () => {
      try {
        const rs = await fetchRoles(guildId);
        if (alive) setRoles(rs);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [guildId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const arr = term ? roles.filter(r => r.name.toLowerCase().includes(term)) : roles;
    return arr.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [roles, q]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!guildId) return <div className="p-6">No guild selected</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <input
          className="border rounded px-3 py-2 bg-transparent"
          placeholder="Filter roles"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-900">
            <tr>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Editable</th>
            </tr>
          </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.roleId} className="border-t">
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color || '#999' }} />
                  {r.name}
                </span>
              </td>
              <td className="px-3 py-2 font-mono">{r.roleId}</td>
              <td className="px-3 py-2">{r.editableByBot && !r.managed ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-500">No roles</td></tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
