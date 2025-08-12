"use client";
import React, { useMemo, useState, ChangeEvent, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRoles, fetchMembers, fetchExternalGroups, updateRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function RolesAndGroups({ guildId }: { guildId: string }) {
  const qc = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ["roles", guildId],
    queryFn: () => fetchRoles(guildId),
  });

  const { data: extGroups = [] } = useQuery({
    queryKey: ["external-groups"],
    queryFn: () => fetchExternalGroups(),
  });

  const allGroups = useMemo(
  () => Array.from(new Set(extGroups.map((g: { group: string }) => g.group))).sort(),
  [extGroups]
  );

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string[]>([]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", guildId, q, roleFilter.join(","), groupFilter.join(",")],
    queryFn: () =>
      fetchMembers(guildId, {
        q: q || undefined,
        role: roleFilter.length ? roleFilter : undefined,
        group: groupFilter.length ? groupFilter : undefined,
      }),
    keepPreviousData: true,
  });

  // Edit role modal
  const [editing, setEditing] = useState<{ roleId: string; name: string; color: string; hoist: boolean; mentionable: boolean } | null>(null);

  const mutation = useMutation({
    mutationFn: (p: { roleId: string; data: { name?: string; color?: string; hoist?: boolean; mentionable?: boolean } }) =>
      updateRole(guildId, p.roleId, p.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles", guildId] });
      setEditing(null);
    },
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" value={q} onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} placeholder="User or ID" />
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-auto border rounded p-2">
            {roles.map((r: any) => {
              const active = roleFilter.includes(r.roleId);
              return (
                <Badge
                  key={r.roleId}
                  variant={active ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() =>
                    setRoleFilter((prev: string[]) => (active ? prev.filter((id: string) => id !== r.roleId) : [...prev, r.roleId]))
                  }
                >
                  {r.name}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Account groups</Label>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-auto border rounded p-2">
            {allGroups.map((g: string) => {
              const active = groupFilter.includes(g);
              return (
                <Badge
                  key={g}
                  variant={active ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() =>
                    setGroupFilter((prev: string[]) => (active ? prev.filter((x: string) => x !== g) : [...prev, g]))
                  }
                >
                  {g}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roles list with Edit buttons */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Discord roles</h3>
        <div className="flex flex-wrap gap-2">
          {roles.map((r: any) => (
            <Badge key={r.roleId} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded"
                style={{ backgroundColor: r.color || "#888" }}
              />
              {r.name}
              <Button
                size="xs"
                variant="secondary"
                onClick={() =>
                  setEditing({
                    roleId: r.roleId,
                    name: r.name,
                    color: r.color || "#000000",
                    hoist: Boolean(r.hoist),
                    mentionable: Boolean(r.mentionable),
                  })
                }
              >
                Edit
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Members table */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Members</h3>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Roles</th>
                  <th className="text-left p-2">Account ID</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.discordUserId} className="border-t">
                    <td className="p-2">{m.username} <span className="text-muted-foreground">({m.discordUserId})</span></td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {m.roleIds.map((id: string) => {
                          const role = roles.find((r: any) => r.roleId === id);
                          return role ? (
                            <Badge key={id} variant="outline">{role.name}</Badge>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="p-2">{m.accountid ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
          </DialogHeader>

          {editing && (
            <form
              className="space-y-4"
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                mutation.mutate({
                  roleId: editing.roleId,
                  data: {
                    name: editing.name,
                    color: editing.color,
                    hoist: editing.hoist,
                    mentionable: editing.mentionable,
                  },
                });
              }}
            >
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label>Name</Label>
                  <Input value={editing.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label>Color</Label>
                  <Input
                    type="text"
                    placeholder="#RRGGBB"
                    value={editing.color}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, color: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.hoist}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, hoist: e.target.checked })}
                    />
                    Hoist
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.mentionable}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, mentionable: e.target.checked })}
                    />
                    Mentionable
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
