"use client";
import { useEffect, useState, useRef, Fragment } from "react";
import { fetchRoles, fetchMembersLegacy, addRole, removeRole } from "@/lib/api";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSession } from "next-auth/react";
import { Dialog } from "@headlessui/react";


export default function RoleKanban({ guildId, customGroups = [] }: { guildId: string, customGroups?: any[] }) {

  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addingToCol, setAddingToCol] = useState<string | null>(null);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
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
          <div className="flex gap-4 min-w-max relative">
            {columns.map((col, idx) => (
              <div className="relative flex-shrink-0" key={col}>
                {/* Vertical separator except for the first column */}
                {idx > 0 && (
                  <div className="absolute -left-2 top-0 h-full w-2 flex items-center z-10" aria-hidden="true">
                    <div className="mx-auto w-px h-4/5 bg-border/80" />
                  </div>
                )}
                <Droppable droppableId={col} key={col}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-64 bg-muted/40 rounded-xl p-3 flex-shrink-0 transition-shadow flex flex-col h-[500px] ${snapshot.isDraggingOver ? 'ring-2 ring-primary/40' : ''}`}
                    >
                      <div className="font-semibold mb-2">
                        {col === "noRole" ? "No Role" : roles.find((r) => r.roleId === col)?.name}
                      </div>
                      <div className="space-y-2 min-h-[40px] flex-1 overflow-y-auto">
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
                                <span className="text-xs font-medium flex-1 min-w-0 truncate break-all">{u.username}</span>
                                {/* Remove button (only for real roles, not noRole) */}
                                {col !== "noRole" && (
                                  <div className="flex-1 flex justify-end min-w-[32px] max-w-[32px]">
                                    <button
                                      className="ml-2 p-1 rounded-full text-xs border border-transparent text-muted-foreground bg-transparent hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center"
                                      title="Remove from this role"
                                      onClick={async () => {
                                        await removeRole(guildId, u.discordUserId, col, session?.user?.id);
                                        setMembers(prev => prev.map(m => m.discordUserId === u.discordUserId ? { ...m, roleIds: m.roleIds.filter((r: string) => r !== col) } : m));
                                      }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414l4.95-4.95-4.95-4.95A1 1 0 015.05 3.636l4.95 4.95z" clipRule="evenodd" />
                                    </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {getColumnUsers(col).length === 0 && <div className="text-xs text-muted-foreground">None</div>}
                        {provided.placeholder}
                        {/* Add user to role (not for noRole) */}
                        {col !== "noRole" && (
                          <div className="mt-2">
                            <button
                              className="w-full mt-1 rounded border px-2 py-1 text-xs hover:bg-accent/20 transition-colors"
                              onClick={() => { setAddingToCol(col); setShowUserModal(true); setUserSearch(""); setSelectedUserToAdd(""); }}
                            >+ Add user</button>
                            {/* Modal for user search/add */}
                            <Dialog as={Fragment} open={showUserModal && addingToCol === col} onClose={() => { setShowUserModal(false); setAddingToCol(null); setUserSearch(""); setSelectedUserToAdd(""); }}>
                              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
                                <Dialog.Panel className="bg-card/80 backdrop-blur-md rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-100/60 dark:border-gray-900/40">
                                  <Dialog.Title className="font-semibold mb-2 text-lg">Add user to role</Dialog.Title>
                                  <input
                                    className="w-full mb-2 px-2 py-1 border rounded text-sm"
                                    placeholder="Search users by name or Discord ID..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="max-h-60 overflow-y-auto mb-2">
                                    {members.filter(m =>
                                      !m.roleIds.includes(col) &&
                                      (userSearch === "" ||
                                        m.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                        (m.discordUserId && m.discordUserId.toLowerCase().includes(userSearch.toLowerCase()))
                                      )
                                    ).slice(0, 50).map(m => (
                                      <div
                                        key={m.discordUserId}
                                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors
                                          ${selectedUserToAdd === m.discordUserId ? 'bg-accent/40 border-accent' : 'hover:bg-gray-50 hover:border-accent border-transparent'}
                                          text-black`}
                                        onClick={() => setSelectedUserToAdd(m.discordUserId)}
                                        style={{ minHeight: 36 }}
                                      >
                                        <img src={m.avatarUrl} alt={m.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                                        <span className="truncate text-xs font-medium">{m.username}</span>
                                        <span className="text-xs ml-auto opacity-70">{m.discordUserId}</span>
                                      </div>
                                    ))}
                                    {members.filter(m =>
                                      !m.roleIds.includes(col) &&
                                      (userSearch === "" ||
                                        m.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                        (m.discordUserId && m.discordUserId.toLowerCase().includes(userSearch.toLowerCase()))
                                      )
                                    ).length === 0 && (
                                      <div className="text-xs text-muted-foreground px-2 py-2">No users found</div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      className="rounded border px-2 py-1 text-xs flex-1 disabled:opacity-50 transition-colors hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-400/40 bg-white text-black border-gray-300"
                                      disabled={!selectedUserToAdd}
                                      onClick={async () => {
                                        if (!selectedUserToAdd || !session?.user?.id) return;
                                        try {
                                          await addRole(guildId, selectedUserToAdd, col, session.user.id);
                                          setMembers(prev => prev.map(m => m.discordUserId === selectedUserToAdd ? { ...m, roleIds: [...m.roleIds, col] } : m));
                                          setShowUserModal(false);
                                          setAddingToCol(null);
                                          setSelectedUserToAdd("");
                                          setUserSearch("");
                                        } catch (err: any) {
                                          let msg = err?.message || "Failed to add user.";
                                          if (msg === "uneditable_role") msg = "This role cannot be edited.";
                                          alert(msg);
                                        }
                                      }}
                                    >Add</button>
                                    <button
                                      className="rounded border px-2 py-1 text-xs flex-1 transition-colors hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-400/40 bg-white text-black border-gray-300"
                                      onClick={() => { setShowUserModal(false); setAddingToCol(null); setSelectedUserToAdd(""); setUserSearch(""); }}
                                    >Cancel</button>
                                  </div>
                                </Dialog.Panel>
                              </div>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

