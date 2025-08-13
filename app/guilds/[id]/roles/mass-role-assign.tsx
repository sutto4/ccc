"use client";
import { useState, useTransition } from "react";
import UserTransferPicker from "@/components/ui/user-transfer-picker";
import RoleMultiPicker from "@/components/ui/role-multi-picker";
import { addRole, removeRole, type Member, type Role } from "@/lib/api";

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
        // For each user, assign all selected roles
        await Promise.all(
          selectedUsers.flatMap((user) =>
            selectedRoles.map((role) =>
              addRole(guildId, user.discordUserId, role.roleId, user.discordUserId)
            )
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
        // For each user, remove all selected roles
        await Promise.all(
          selectedUsers.flatMap((user) =>
            selectedRoles.map((role) =>
              removeRole(guildId, user.discordUserId, role.roleId, user.discordUserId)
            )
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
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="font-medium mb-2">Select users to assign roles to:</div>
      <div className="mb-4">
        <UserTransferPicker
          guildId={guildId}
          value={selectedUsers}
          onChange={setSelectedUsers}
          disabled={saving}
        />
      </div>
      <div className="font-medium mb-2">Select roles to assign:</div>
      <div className="mb-4">
        <RoleMultiPicker
          roles={roles}
          value={selectedRoles}
          onChange={setSelectedRoles}
          disabled={saving}
        />
      </div>
      <div className="flex gap-2 w-full max-w-xs mx-auto">
        <button
          className="flex-1 rounded bg-primary text-primary-foreground px-4 py-2 font-semibold shadow hover:bg-primary/90 transition disabled:opacity-50"
          onClick={handleSave}
          disabled={saving || !selectedUsers.length || !selectedRoles.length}
        >
          {saving ? "Saving..." : "Assign Roles"}
        </button>
        <button
          className="flex-1 rounded bg-red-600 text-white px-4 py-2 font-semibold shadow hover:bg-red-700 transition disabled:opacity-50"
          onClick={handleRemove}
          disabled={saving || !selectedUsers.length || !selectedRoles.length}
        >
          {saving ? "Saving..." : "Remove Roles"}
        </button>
      </div>
      {success && <div className="text-green-600 text-sm text-center">{success}</div>}
      {error && <div className="text-red-600 text-sm text-center">{error}</div>}
    </div>
  );
}
