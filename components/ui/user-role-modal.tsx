import { useState, useMemo } from "react";

export function UserRoleModal({
  open,
  onClose,
  user,
  allRoles,
  onAddRole,
  onRemoveRole,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
  allRoles: any[];
  onAddRole: (roleId: string) => void;
  onRemoveRole: (roleId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const availableRoles = useMemo(
    () =>
      allRoles.filter(
        (r) =>
          !user.roleIds.includes(r.roleId) &&
          (!search || r.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [allRoles, user.roleIds, search]
  );
  return open ? (
    <div className="fixed z-[200] inset-0 flex items-center justify-center">
      {/* Overlay: no blur, just dim */}
      <div className="fixed inset-0 bg-black/10" aria-hidden="true" onClick={onClose} />
      {/* Modal with frosted-glass effect */}
      <div
        className="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-auto z-10 border border-gray-200 backdrop-blur-md"
        style={{
          background: 'rgba(255,255,255,0.75)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)'
        }}
      >
        <div className="text-lg font-semibold mb-2">Manage Roles for {user.username}</div>
        <div className="mb-2 text-xs text-muted-foreground">Discord ID: {user.discordUserId}</div>
        <div className="mb-2 font-medium">Current Roles</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {user.roleIds.length > 0 ? (
            user.roleIds.map((rid: string) => {
              const r = allRoles.find((role) => role.roleId === rid);
              return (
                <span key={rid} className="inline-flex items-center bg-gray-200 rounded-full px-3 py-1 text-xs font-medium">
                  {r?.name || rid}
                  <button
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                    onClick={() => onRemoveRole(rid)}
                    title="Remove role"
                  >
                    ×
                  </button>
                </span>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground">No roles assigned</span>
          )}
        </div>
        <div className="mb-2 font-medium">Add Role</div>
        <input
          className="w-full rounded border px-3 py-2 text-sm mb-2"
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-40 overflow-y-auto rounded border bg-white/40 mb-4">
          {availableRoles.length > 0 ? (
            availableRoles.map((r) => (
              <div key={r.roleId} className="flex items-center gap-2 px-2 py-1 hover:bg-blue-50 cursor-pointer">
                <span className="truncate text-xs font-medium">{r.name}</span>
                <span className="ml-auto text-xs text-gray-500">{r.roleId}</span>
                <button
                  className="ml-2 rounded-full border px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => onAddRole(r.roleId)}
                  title="Add role"
                >
                  Add
                </button>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400 px-2 py-2">No roles found</div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
