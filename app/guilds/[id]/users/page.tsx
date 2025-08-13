"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Section from "@/components/ui/section";
import {
  fetchMembersLegacy,
  fetchRoles,
  addRole,
  removeRole,
  type Role,
} from "@/lib/api";

type Member = {
  guildId: string;
  discordUserId: string;
  username: string;
  avatarUrl: string;
  roleIds: string[];
  accountid: string | null;
  groups?: string[];
};
import { useSession } from "next-auth/react";

type Row = Member & { rolesExpanded?: boolean };

const DEFAULT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

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
  const perPage = 40;
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [m, r] = await Promise.all([
          fetchMembersLegacy(guildId),
          fetchRoles(guildId),
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
  }, [guildId]);

  // Filter and paginate users (cross-filter: username and role)
  useEffect(() => {
    let filtered = members;
    if (search) {
      filtered = filtered.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.discordUserId && u.discordUserId.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (roleFilter) {
      filtered = filtered.filter((u) => u.roleIds.includes(roleFilter));
    }
    setDisplayed(filtered.slice(0, page * perPage));
  }, [members, search, roleFilter, page]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((p) => p + 1);
      }
    });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loaderRef.current]);

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.roleId, r])), [roles]);

  const availableRolesFor = (row: Row) =>
    roles.filter(
      (r) =>
        !row.roleIds.includes(r.roleId) &&
        r.roleId !== guildId &&
        (r as any).managed !== true &&
        (r as any).editableByBot !== false
    );

  async function onAdd() {
    if (!addingFor || !selectedRole) return;
    try {
      const actor = (session?.user as any)?.id || "";
      await addRole(guildId, addingFor, selectedRole, actor);
      setMembers((prev) =>
        prev.map((m) =>
          m.discordUserId === addingFor
            ? { ...m, roleIds: [...m.roleIds, selectedRole] }
            : m
        )
      );
    } catch (e: any) {
      alert(`Add failed: ${e?.message || "unknown"}`);
    } finally {
      setAddingFor(null);
      setSelectedRole("");
    }
  }

  async function onRemove(userId: string, roleId: string) {
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
      title="Users"
      right={
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${members.length.toLocaleString()} users`}
        </div>
      }
    >
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="mb-4 flex gap-2 items-center">
        <input
          type="text"
          className="w-full max-w-xs rounded-md border px-2 py-1 text-xs bg-background"
          placeholder="Search users by name or Discord ID…"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="rounded-md border px-2 py-1 text-xs bg-background"
          value={roleFilter}
          onChange={e => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.roleId} value={r.roleId}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left font-semibold">User</th>
              <th className="px-3 py-2 text-left font-semibold">Roles</th>
            </tr>
          </thead>
          <tbody>
            {!loading && displayed.map((m) => (
              <tr key={m.discordUserId} className="border-b last:border-0">
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
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {m.roleIds.map((rid) => {
                      const r = roleMap.get(rid);
                      const name = r?.name ?? "unknown";
                      const color = r?.color || null;
                      const uneditable =
                        rid === guildId || (r as any)?.managed === true || (r as any)?.editableByBot === false;
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
                          {!uneditable && (
                            <button
                              onClick={() => onRemove(m.discordUserId, rid)}
                              className="ml-1 rounded-full border px-1 hover:bg-muted"
                              aria-label={`Remove ${name}`}
                              title="Remove role"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                    <button
                      className="ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                      onClick={() => setAddingFor(m.discordUserId)}
                      title="Add role"
                    >
                      ＋
                    </button>
                    {addingFor === m.discordUserId && (
                      <div className="ml-2 inline-flex items-center gap-2">
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                        >
                          <option value="">Select role…</option>
                          {availableRolesFor(m).map((r) => (
                            <option key={r.roleId} value={r.roleId}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          onClick={onAdd}
                        >
                          Add
                        </button>
                        <button
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() => {
                            setAddingFor(null);
                            setSelectedRole("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && displayed.length === 0 && (
              <tr>
                <td className="py-6 text-muted-foreground text-center" colSpan={2}>
                  No users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Infinite scroll loader */}
      <div ref={loaderRef} className="h-8" />
    </Section>
  );
}
