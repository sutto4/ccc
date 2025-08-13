"use client";

import { useEffect, useMemo, useState } from "react";
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

type Row = Member & { rolesExpanded?: boolean };

export default function UsersPage() {
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [m, r] = await Promise.all([fetchMembersLegacy(guildId), fetchRoles(guildId)]);
        if (!alive) return;
        setMembers(m);
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
        r.roleId !== guildId && // @everyone
        (r as any).managed !== true && // bot-managed, skip
        (r as any).editableByBot !== false // server says we can't edit
    );

  async function onAdd() {
    if (!addingFor || !selectedRole) return;
    try {
      const actor = (session?.user as any)?.id || "";
      await addRole(guildId, addingFor, selectedRole, actor);
      setMembers((prev) =>
        prev.map((m) =>
          m.discordUserId === addingFor ? { ...m, roleIds: [...m.roleIds, selectedRole] } : m
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 px-3">Discord ID</th>
              <th className="py-2 px-3">Roles</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              members.map((m) => (
                <tr key={m.discordUserId} className="border-b last:border-b-0">
                  <td className="py-3 pr-3 font-medium">{m.username}</td>
                  <td className="py-3 px-3 font-mono text-xs">{m.discordUserId}</td>
                  <td className="py-3 px-3">
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
                            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
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

                      {/* Add role control */}
                      <button
                        className="ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
                        onClick={() => setAddingFor(m.discordUserId)}
                        title="Add role"
                      >
                        ＋ Add
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
            {!loading && members.length === 0 && (
              <tr>
                <td className="py-6 text-muted-foreground" colSpan={3}>
                  No users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
