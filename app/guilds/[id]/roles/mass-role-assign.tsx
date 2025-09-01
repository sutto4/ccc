"use client";
import { useState, useTransition } from "react";
import UserTransferPicker from "@/components/ui/user-transfer-picker";
import RoleMultiPicker from "@/components/ui/role-multi-picker";
import { addRole, removeRole, type Member, type Role } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { usePermissions } from "@/hooks/use-permissions";
import { useSharedSession } from "@/components/providers";

export default function MassRoleAssign({ guildId, roles }: { guildId: string; roles: Role[] }) {
  const { canUseApp, loading: permissionsLoading, error: permissionsError } = usePermissions(guildId);
  const { data: session } = useSharedSession();
  const [selectedUsers, setSelectedUsers] = useState<Member[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [saving, startSaving] = useTransition();
  const [success, setSuccess] = useState<string | false>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(false);
    if (!selectedUsers.length || !selectedRoles.length) return;
    if (!session?.user?.id) {
      setError("Session expired. Please log in again.");
      return;
    }

    startSaving(async () => {
      const results = {
        successful: [] as string[],
        failed: [] as { user: string; error: string }[],
        total: selectedUsers.length * selectedRoles.length
      };

      try {
        // Process each user-role combination individually to handle errors gracefully
        for (const user of selectedUsers) {
          for (const role of selectedRoles) {
            try {
              await addRole(guildId, user.discordUserId, role.roleId, session.user.id);
              await logAction({
                guildId,
                userId: session.user.id,
                actionType: "role.add",
                user: { id: session.user.id, username: session.user.name || 'Unknown' },
                actionData: {
                  targetUser: user.discordUserId,
                  targetUsername: user.username,
                  role: role.roleId,
                  roleName: role.name,
                  source: "mass-role-assign"
                }
              });
              results.successful.push(`${user.username} (${role.name})`);
            } catch (roleError: any) {
              let errorMessage = "Unknown error";

              if (roleError?.error === "user_not_found") {
                errorMessage = "User is no longer a member of the server";
              } else if (roleError?.message) {
                errorMessage = roleError.message;
              } else if (typeof roleError === 'string') {
                errorMessage = roleError;
              }

              results.failed.push({
                user: `${user.username} (${role.name})`,
                error: errorMessage
              });

              console.warn(`Failed to assign role ${role.name} to ${user.username}:`, roleError);
            }
          }
        }

        // Prepare success message with summary
        let successMessage = `Processed ${results.successful.length + results.failed.length} role assignments.`;
        if (results.successful.length > 0) {
          successMessage += ` ${results.successful.length} successful.`;
        }
        if (results.failed.length > 0) {
          successMessage += ` ${results.failed.length} failed.`;
        }

        setSuccess(successMessage);

        // Show detailed error information if there were failures
        if (results.failed.length > 0) {
          const failedDetails = results.failed.map(f => `${f.user}: ${f.error}`).join('\n');
          setError(`Some role assignments failed:\n${failedDetails}`);
        }

        // Clear selections only if everything was successful
        if (results.failed.length === 0) {
          setSelectedUsers([]);
          setSelectedRoles([]);
        }
      } catch (e: any) {
        setError(e.message || "Failed to assign roles");
      }
    });
  }

  async function handleRemove() {
    setError(null);
    setSuccess(false);
    if (!selectedUsers.length || !selectedRoles.length) return;
    if (!session?.user?.id) {
      setError("Session expired. Please log in again.");
      return;
    }

    startSaving(async () => {
      const results = {
        successful: [] as string[],
        failed: [] as { user: string; error: string }[],
        total: selectedUsers.length * selectedRoles.length
      };

      try {
        // Process each user-role combination individually to handle errors gracefully
        for (const user of selectedUsers) {
          for (const role of selectedRoles) {
            try {
              await removeRole(guildId, user.discordUserId, role.roleId, session.user.id);
              await logAction({
                guildId,
                userId: session.user.id,
                actionType: "role.remove",
                user: { id: session.user.id, username: session.user.name || 'Unknown' },
                actionData: {
                  targetUser: user.discordUserId,
                  targetUsername: user.username,
                  role: role.roleId,
                  roleName: role.name,
                  source: "mass-role-assign"
                }
              });
              results.successful.push(`${user.username} (${role.name})`);
            } catch (roleError: any) {
              let errorMessage = "Unknown error";

              if (roleError?.error === "user_not_found") {
                errorMessage = "User is no longer a member of the server";
              } else if (roleError?.message) {
                errorMessage = roleError.message;
              } else if (typeof roleError === 'string') {
                errorMessage = roleError;
              }

              results.failed.push({
                user: `${user.username} (${role.name})`,
                error: errorMessage
              });

              console.warn(`Failed to remove role ${role.name} from ${user.username}:`, roleError);
            }
          }
        }

        // Prepare success message with summary
        let successMessage = `Processed ${results.successful.length + results.failed.length} role removals.`;
        if (results.successful.length > 0) {
          successMessage += ` ${results.successful.length} successful.`;
        }
        if (results.failed.length > 0) {
          successMessage += ` ${results.failed.length} failed.`;
        }

        setSuccess(successMessage);

        // Show detailed error information if there were failures
        if (results.failed.length > 0) {
          const failedDetails = results.failed.map(f => `${f.user}: ${f.error}`).join('\n');
          setError(`Some role removals failed:\n${failedDetails}`);
        }

        // Clear selections only if everything was successful
        if (results.failed.length === 0) {
          setSelectedUsers([]);
          setSelectedRoles([]);
        }
      } catch (e: any) {
        setError(e.message || "Failed to remove roles");
      }
    });
  }

  // Check permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (permissionsError) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">Permission Check Failed</div>
        <p className="text-sm text-muted-foreground">{permissionsError}</p>
      </div>
    );
  }

  if (!canUseApp) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">Access Denied</div>
        <p className="text-sm text-muted-foreground">
          You don't have permission to access the mass role assign feature. Contact a server administrator.
        </p>
      </div>
    );
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
            roles={roles}
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
