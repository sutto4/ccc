"use client";
import { useEffect, useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { fetchRoles, fetchMembersLegacy, addRole, removeRole } from "@/lib/api";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSession } from "next-auth/react";


export default function RoleKanban({ guildId, customGroups = [] }: { guildId: string, customGroups?: any[] }) {

  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  // Modal state for adding user
  const [addUserRoleId, setAddUserRoleId] = useState<string|null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addingUser, setAddingUser] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    fetchRoles(guildId).then(setRoles);
    fetchMembersLegacy(guildId).then(setMembers);
  }, [guildId]);

  useEffect(() => {
    setSelectedRoleIds(roles.map(r => r.roleId));
  }, [roles]);

  // Force dropdown background to match theme, even if theme changes while open
  useEffect(() => {
    if (!dropdownOpen || !dropdownRef.current) return;
    const el = dropdownRef.current;
    function setDropdownBg() {
      if (document.documentElement.classList.contains('dark')) {
        el.style.setProperty('background-color', '#18181b', 'important');
        el.style.setProperty('color', '#fff', 'important');
      } else {
        el.style.setProperty('background-color', '#fff', 'important');
        el.style.setProperty('color', '', 'important');
      }
    }
    setDropdownBg();
    // Listen for theme changes
    const observer = new MutationObserver(setDropdownBg);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [dropdownOpen]);

  // Map roleId to members
  const roleMap: Record<string, any[]> = {};
  roles.forEach((role) => {
    roleMap[role.roleId] = members.filter((m) => m.roleIds.includes(role.roleId));
  });
  // Users with no roles (no roles at all)
  const noRole = members.filter((m) => m.roleIds.length === 0);
  // Users not in this role (for add user modal)
  const usersNotInRole = (roleId: string) => members.filter((m) => !m.roleIds.includes(roleId));

  // For DnD: columns = ["noRole", ...selectedRoleIds]
  const columns = ["noRole", ...selectedRoleIds];
  const getColumnUsers = (col: string) =>
    col === "noRole" ? noRole : roleMap[col] || [];

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId) return;
    const user = members.find((m: any) => m.discordUserId === draggableId);
    if (!user) return;
    const fromRole = source.droppableId === "noRole" ? null : source.droppableId;
    const toRole = destination.droppableId === "noRole" ? null : destination.droppableId;
    const actor = (session?.user as any)?.id || undefined;
    if (fromRole && actor) {
      removeRole(guildId, user.discordUserId, fromRole, actor);
    }
    if (toRole && actor) {
      addRole(guildId, user.discordUserId, toRole, actor);
    }
    setMembers((prev: any[]) =>
      prev.map((m) =>
        m.discordUserId === user.discordUserId
          ? {
              ...m,
              roleIds: [
                ...m.roleIds.filter((rid: string) => rid !== fromRole),
                ...(toRole ? [toRole] : [])
              ]
            }
          : m
      )
    );
  }

  return (
    <div>
      {/* Role selection UI: searchable multi-select */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium mr-2">Visible Roles:</span>
            <button
              className="px-2 py-1 rounded bg-muted text-xs border hover:bg-accent"
              onClick={() => setSelectedRoleIds(roles.map(r => r.roleId))}
            >Add All</button>
            <button
              className="px-2 py-1 rounded bg-muted text-xs border hover:bg-accent"
              onClick={() => setSelectedRoleIds([])}
            >Clear All</button>
          </div>
          <div className="relative w-full max-w-xs sm:max-w-xs md:max-w-xs lg:max-w-xs xl:max-w-xs" style={{maxWidth: 240}}>
            <input
              ref={inputRef}
              type="text"
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="Search roles..."
              value={roleSearch}
              onChange={e => {
                setRoleSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                setDropdownOpen(true);
                inputRef.current?.select();
              }}
              autoComplete="off"
            />
            {roleSearch && (
              <button
                className="absolute right-2 top-1 text-xs text-muted-foreground"
                onClick={() => setRoleSearch("")}
                tabIndex={-1}
              >✕</button>
            )}
            {dropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full z-[100] bg-white dark:bg-neutral-900 border rounded shadow w-full max-h-48 overflow-y-auto mt-1"
                style={{ minWidth: 200 }}
              >
                {roles
                  .filter(role =>
                    role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                    role.roleId.toLowerCase().includes(roleSearch.toLowerCase())
                  )
                  .map(role => (
                    <div
                      key={role.roleId}
                      className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-accent ${selectedRoleIds.includes(role.roleId) ? 'bg-accent/50' : ''}`}
                      onClick={() => {
                        setSelectedRoleIds(ids =>
                          ids.includes(role.roleId)
                            ? ids.filter(id => id !== role.roleId)
                            : [...ids, role.roleId]
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.roleId)}
                        readOnly
                      />
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: role.color || '#e5e7eb', borderColor: role.color || '#e5e7eb' }} />
                      {role.name}
                    </div>
                  ))}
                {roles.filter(role =>
                  role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                  role.roleId.toLowerCase().includes(roleSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No roles found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`w-64 bg-muted/40 rounded-xl p-3 flex-shrink-0 transition-shadow ${snapshot.isDraggingOver ? 'ring-2 ring-primary/40' : ''}`}
                  >
                    <div className="font-semibold mb-2">
                      {col === "noRole" ? "No Role" : roles.find((r) => r.roleId === col)?.name}
                    </div>
                    <div className="space-y-2 min-h-[40px]">
                      {getColumnUsers(col).map((u, idx) => (
                        <Draggable draggableId={u.discordUserId} index={idx} key={u.discordUserId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-card rounded-lg p-2 flex items-center gap-2 shadow-sm transition ${snapshot.isDragging ? 'ring-2 ring-primary/60' : ''}`}
                            >
                              <img src={u.avatarUrl} alt={u.username} className="w-7 h-7 rounded-full border bg-muted object-cover" />
                              <span className="truncate text-xs font-medium">{u.username}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {getColumnUsers(col).length === 0 && <div className="text-xs text-muted-foreground">None</div>}
                      {provided.placeholder}
                    </div>
                    {/* Add user button (not for 'noRole' column) */}
                    {col !== "noRole" && (
                      <button
                        className="mt-3 w-full rounded bg-primary text-primary-foreground py-1 text-xs font-semibold shadow hover:bg-primary/90 transition"
                        onClick={() => {
                          setAddUserRoleId(col);
                          setUserSearch("");
                          setSelectedUserId("");
                        }}
                      >
                        ＋ Add user
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>
      {/* Modal for adding user to role */}
      <Dialog open={!!addUserRoleId} onClose={() => setAddUserRoleId(null)} className="fixed z-[200] inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/10" aria-hidden="true" onClick={() => setAddUserRoleId(null)} />
        <div
          className="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-auto z-10 backdrop-blur-md border border-gray-200"
          style={{
            background: 'rgba(255,255,255,0.35)',
            color: '#111827',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)'
          }}
        >
          <Dialog.Title className="text-lg font-semibold mb-2">Add user to role</Dialog.Title>
          <input
            type="text"
            className="w-full px-2 py-1 border rounded text-sm mb-2 bg-white/60 text-black placeholder:text-gray-400"
            placeholder="Search users by name or Discord ID..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto mb-3">
            {usersNotInRole(addUserRoleId || "").filter(u =>
              u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
              (u.accountid && u.accountid.toLowerCase().includes(userSearch.toLowerCase()))
            ).map(u => (
              <div
                key={u.discordUserId}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selectedUserId === u.discordUserId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedUserId(u.discordUserId)}
              >
                <img src={u.avatarUrl} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                <span className="truncate text-xs font-medium text-black">{u.username}</span>
                {u.accountid && <span className="ml-auto text-xs text-gray-500">{u.accountid}</span>}
                <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
              </div>
            ))}
            {usersNotInRole(addUserRoleId || "").filter(u =>
              u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
              (u.accountid && u.accountid.toLowerCase().includes(userSearch.toLowerCase()))
            ).length === 0 && (
              <div className="text-xs text-gray-400 px-2 py-2">No users found</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded bg-blue-600 text-white py-1 font-semibold text-xs shadow hover:bg-blue-700 transition disabled:opacity-50"
              disabled={!selectedUserId || addingUser}
              onClick={async () => {
                if (!addUserRoleId || !selectedUserId) return;
                setAddingUser(true);
                try {
                  const actor = (session?.user as any)?.id || undefined;
                  await addRole(guildId, selectedUserId, addUserRoleId, actor);
                  setMembers(prev => prev.map(m => m.discordUserId === selectedUserId ? { ...m, roleIds: [...m.roleIds, addUserRoleId] } : m));
                  setAddUserRoleId(null);
                } catch (e: any) {
                  alert('Failed to add user: ' + (e?.message || String(e)));
                } finally {
                  setAddingUser(false);
                }
              }}
            >Add</button>
            <button
              className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition"
              onClick={() => setAddUserRoleId(null)}
              disabled={addingUser}
            >Cancel</button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

