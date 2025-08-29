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
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  const availableRoles = useMemo(
    () =>
      allRoles.filter(
        (r) =>
          !user.roleIds.includes(r.roleId) &&
          (!search || r.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [allRoles, user.roleIds, search]
  );

  const handleAddRole = async (roleId: string) => {
    await onAddRole(roleId);
    setSelectedRole("");
    setSearch("");
  };

  return open ? (
    <div className="fixed z-[200] inset-0 flex items-center justify-center">
      {/* Overlay with backdrop blur */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      
      {/* Modal with modern glassmorphism design */}
      <div
        className="relative rounded-xl shadow-xl p-4 w-full max-w-md mx-auto z-10 border border-white/20"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#111827',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)'
        }}
      >
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Manage Roles for {user.username}</h2>
          <p className="text-xs text-gray-600 font-mono">Discord ID: {user.discordUserId}</p>
        </div>

        {/* Current Roles Section */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Roles</h3>
          <div className="flex flex-wrap gap-1.5">
            {user.roleIds.length > 0 ? (
              user.roleIds.map((rid: string) => {
                const r = allRoles.find((role) => role.roleId === rid);
                const name = r?.name || rid;
                const color = r?.color || null;
                return (
                  <span 
                    key={rid} 
                    className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200 transition-all duration-200 group"
                    style={{
                      backgroundColor: color ? `${color}20` : undefined,
                      borderColor: color || undefined,
                    }}
                  >
                    <span className="truncate max-w-[100px]" title={name}>{name}</span>
                    <button
                      className="ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-0.5 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                      onClick={() => onRemoveRole(rid)}
                      title="Remove role"
                      aria-label={`Remove ${name}`}
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-500 italic">No roles assigned</span>
            )}
          </div>
        </div>

        {/* Add Role Section */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Add Role</h3>
          <div className="mb-3">
            <input
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white/80 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-32 overflow-y-auto bg-gray-50/50 rounded-lg border border-gray-100">
            {availableRoles.length > 0 ? (
              availableRoles.map((r) => (
                <div
                  key={r.roleId}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                    selectedRole === r.roleId
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-white/60'
                  }`}
                  onClick={() => setSelectedRole(r.roleId)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate" title={r.name}>{r.name}</span>
                    <span className="block text-xs text-gray-500 font-mono">{r.roleId}</span>
                  </div>
                  {selectedRole === r.roleId && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 px-3 py-4 text-center">
                {search ? 'No roles found matching your search' : 'No roles available to add'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedRole}
            onClick={() => selectedRole && handleAddRole(selectedRole)}
          >
            Add Role
          </button>
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-all duration-200 border border-gray-200 hover:border-gray-300"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;
}
