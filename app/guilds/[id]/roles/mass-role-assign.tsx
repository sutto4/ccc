"use client";
import { useState, useTransition } from "react";
import UserTransferPicker from "@/components/ui/user-transfer-picker";
import RoleMultiPicker from "@/components/ui/role-multi-picker";
import { addRole, removeRole, type Member, type Role } from "@/lib/api";
import { logAction } from "@/lib/logger";

export default function MassRoleAssign({ guildId, roles }: { guildId: string; roles: Role[] }) {
  const [selectedUsers, setSelectedUsers] = useState<Member[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [saving, startSaving] = useTransition();
  const [success, setSuccess] = useState<string | false>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    if (!selectedUsers.length || !selectedRoles.length) return;
    startSaving(async () => {
      try {
        // For each user, assign all selected roles and log each action
        await Promise.all(
          selectedUsers.flatMap((user) =>
            selectedRoles.map(async (role) => {
              await addRole(guildId, user.discordUserId, role.roleId, user.discordUserId);
              await logAction({
                guildId,
                userId: user.discordUserId,
                actionType: "role.add",
                user: { id: user.discordUserId, username: user.username },
                actionData: {
                  targetUser: user.discordUserId,
                  targetUsername: user.username,
                  role: role.roleId,
                  roleName: role.name,
                  source: "mass-role-assign"
                }
              });
            })
          )
        );
        setSuccess("Roles assigned successfully!");
        setSelectedUsers([]);
        setSelectedRoles([]);
      } catch (e: any) {
        setError(e.message || "Failed to assign roles");
      }
    });
  }

  async function handleRemove() {
    setError(null);
    setSuccess(false);
    if (!selectedUsers.length || !selectedRoles.length) return;
    startSaving(async () => {
      try {
        // For each user, remove all selected roles and log each action
        await Promise.all(
          selectedUsers.flatMap((user) =>
            selectedRoles.map(async (role) => {
              await removeRole(guildId, user.discordUserId, role.roleId, user.discordUserId);
              await logAction({
                guildId,
                userId: user.discordUserId,
                actionType: "role.remove",
                user: { id: user.discordUserId, username: user.username },
                actionData: {
                  targetUser: user.discordUserId,
                  targetUsername: user.username,
                  role: role.roleId,
                  roleName: role.name,
                  source: "mass-role-assign"
                }
              });
            })
          )
        );
        setSuccess("Roles removed successfully!");
        setSelectedUsers([]);
        setSelectedRoles([]);
      } catch (e: any) {
        setError(e.message || "Failed to remove roles");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary / Toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-3">
          <span>
            <span className="font-semibold text-foreground">{selectedUsers.length.toLocaleString()}</span> users selected
          </span>
          <span>•</span>
          <span>
            <span className="font-semibold text-foreground">{selectedRoles.length.toLocaleString()}</span> roles selected
          </span>
          {(selectedUsers.length > 0 || selectedRoles.length > 0) && (
            <button
              className="text-xs underline underline-offset-4 hover:text-foreground"
              onClick={() => { setSelectedUsers([]); setSelectedRoles([]); }}
              disabled={saving}
            >
              Clear selection
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow hover:bg-primary/90 transition disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !selectedUsers.length || !selectedRoles.length}
          >
            {saving ? "Saving..." : "Assign Roles"}
          </button>
          <button
            className="rounded bg-red-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-red-700 transition disabled:opacity-50"
            onClick={handleRemove}
            disabled={saving || !selectedUsers.length || !selectedRoles.length}
          >
            {saving ? "Saving..." : "Remove Roles"}
          </button>
        </div>
      </div>

      {/* Two-column workspace */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Users column */}
        <div className="md:col-span-3 rounded-xl border bg-card p-4 shadow-sm h-[60vh] flex flex-col">
          <div className="font-medium mb-3">Select users</div>
          <UserTransferPicker
            guildId={guildId}
            value={selectedUsers}
            onChange={setSelectedUsers}
            disabled={saving}
          />
        </div>

        {/* Roles column */}
        <div className="md:col-span-2 rounded-xl border bg-card p-4 shadow-sm h-[60vh] flex flex-col">
          <div className="font-medium mb-3">Select roles</div>
          <RoleMultiPicker
            roles={roles}
            value={selectedRoles}
            onChange={setSelectedRoles}
            disabled={saving}
          />
        </div>
      </div>

      {/* Feedback */}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
