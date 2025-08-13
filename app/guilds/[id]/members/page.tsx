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

type Row = Member & { rolesExpanded?: boolean; avatarUrl: string };

export default function MembersPage() {
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
        setMembers(m.map((mem: any) => ({
          ...mem,
          avatarUrl: typeof mem.avatarUrl === "string" && mem.avatarUrl ? mem.avatarUrl : "https://cdn.discordapp.com/embed/avatars/0.png",
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
      title="Members"
      right={
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${members.length.toLocaleString()} members`}
        </div>
      }
    >
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {!loading && members.map((m) => (
          <div key={m.discordUserId} className="bg-card border rounded-xl p-4 flex flex-col items-center shadow-md relative hover:shadow-lg transition-shadow">
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
            <div className="flex flex-wrap items-center gap-1 justify-center w-full mb-1">
              {(m.groups ?? []).length
                ? (m.groups ?? []).map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs bg-muted/50"
                    >
                      {g}
                    </span>
                  ))
                : <span className="text-xs text-muted-foreground">none</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1 justify-center w-full mt-1">
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
            </div>
            <button
              className="mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs hover:bg-muted"
              onClick={() => setAddingFor(m.discordUserId)}
              title="Add role"
            >
              ＋ Add Role
            </button>
            {addingFor === m.discordUserId && (
              <div className="mt-2 flex flex-col items-center gap-2 w-full">
                <select
                  className="rounded-md border bg-background px-2 py-1 text-xs w-full"
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
                <div className="flex gap-2 w-full">
                  <button
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted flex-1"
                    onClick={onAdd}
                  >
                    Add
                  </button>
                  <button
                    className="rounded-md border px-2 py-1 text-xs hover:bg-muted flex-1"
                    onClick={() => {
                      setAddingFor(null);
                      setSelectedRole("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && members.length === 0 && (
          <div className="py-6 text-muted-foreground col-span-full text-center">
            No members.
          </div>
        )}
      </div>
    </Section>
  );
}
