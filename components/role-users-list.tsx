
import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { addRole, removeRole } from "@/lib/api";
import { logAction } from "@/lib/logger";
import { useMembersKanbanQuery } from "@/hooks/use-members-query";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_AVATAR = "/placeholder-user.jpg";

export default function RoleUsersList({ guildId, roleId, roleName }: { guildId: string; roleId: string; roleName?: string }) {
	// Use React Query for member management
	const { data: allMembers = [], isLoading: loading, error, refetch: loadMembers } = useMembersKanbanQuery(guildId);
	
	const [users, setUsers] = useState<any[]>([]);
	const [search, setSearch] = useState("");
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [userSearch, setUserSearch] = useState("");
	const [addResults, setAddResults] = useState<any[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [adding, setAdding] = useState(false);
	const { data: session } = useSession();
	const { toast } = useToast();

	// Filter users in the role based on search
	useEffect(() => {
		if (allMembers.length > 0) {
			const filteredUsers = allMembers.filter((m) => 
				m.roleIds && m.roleIds.includes(roleId) && 
				(search === "" || m.username.toLowerCase().includes(search.toLowerCase()))
			);
			// console.log(`[ROLE-USERS-LIST] Filtering users for role ${roleId}:`, {
			// 	allMembersCount: allMembers.length,
			// 	filteredUsersCount: filteredUsers.length,
			// 	roleId,
			// 	search,
			// 	refreshTrigger,
			// 	sampleMember: allMembers[0] ? { id: allMembers[0].discordUserId, roleIds: allMembers[0].roleIds } : null
			// });
			setUsers(filteredUsers);
		}
	}, [allMembers, roleId, search]);

	useEffect(() => {
		if (!addModalOpen) {
			setAddResults([]);
			return;
		}
		// Always show all users not in the role, filter client-side like Kanban
		const notInRole = allMembers.filter((u) => !users.some((m) => m.discordUserId === u.discordUserId));
		setAddResults(notInRole);
	}, [addModalOpen, allMembers, users]);

	async function handleAdd(userId: string) {
		   if (!session?.user?.id) return;
		   setAdding(true);
		   try {
			   await addRole(guildId, userId, roleId, session.user.id);

			   // Success - update UI optimistically and log action
			   const targetUser = addResults.find((u) => u.discordUserId === userId) || {};
			   // Add the role to the user's roleIds for immediate UI update
			   const updatedTargetUser = { ...targetUser, roleIds: [...(targetUser.roleIds || []), roleId] };
			   setUsers((prev) => [...prev, updatedTargetUser]);
			   setAddModalOpen(false);
			   setUserSearch("");
			   setAddResults([]);
			   setSelectedUserId("");

			   // Logging
			   const actor = session.user.id;
			   const actorUsername = session.user.name || (session.user as any).username || session.user.id;
			   logAction({
				   guildId,
				   userId: actor,
				   actionType: "role.add",
				   user: { id: actor, username: actorUsername },
				   actionData: {
					   targetUser: userId,
					   targetUsername: targetUser.username,
					   role: roleId,
					   roleName: roleName,
					   source: "role-users-list"
				   }
			   });

			   toast({
				   title: "User Added",
				   description: `${targetUser.username} has been added to ${roleName || 'the role'}.`,
			   });

			   // Refresh member data to reflect role changes (with small delay to allow API to process)
			   // This ensures the parent Role Explorer gets updated user counts
			   setTimeout(() => {
				   loadMembers();
			   }, 500);
		   } catch (error: any) {
			   // Ensure error is properly handled and doesn't bubble up
			   const errorMessage = error?.message || error?.toString() || 'Unknown error';

			   // For expected errors (hierarchy/permission issues), only log minimal info
			   if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles') || errorMessage.includes('uneditable_role')) {
				   console.log('[ROLE-USERS-LIST] Role assignment blocked (expected):', errorMessage);
				   
				   // Provide friendly error messages for common issues
				   let friendlyMessage = errorMessage;
			   if (errorMessage.toLowerCase().includes('hierarchy') || errorMessage.toLowerCase().includes('higher') || errorMessage.toLowerCase().includes('position')) {
				   friendlyMessage = "❌ Bot's role is not high enough in the server hierarchy to assign this role. Move the bot's role above the target role in Server Settings > Roles.";
				   } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('manage_roles')) {
					   friendlyMessage = "❌ Bot lacks 'Manage Roles' permission. Grant this permission in Server Settings > Roles.";
				   } else if (errorMessage.toLowerCase().includes('cannot assign roles')) {
					   friendlyMessage = "❌ Bot cannot assign this role due to permission restrictions.";
				   } else if (errorMessage.toLowerCase().includes('uneditable_role')) {
					   friendlyMessage = "❌ This role cannot be assigned/removed. It may be a managed role (from a bot or integration) or have special restrictions.";
				   }
				   
				   toast({
					   title: "Role Assignment Blocked",
					   description: friendlyMessage,
					   variant: "destructive",
				   });
				   return; // Prevent any further error propagation
			   } else {
				   // For unexpected errors, log full details for debugging
				   console.error('[ROLE-USERS-LIST] Unexpected error adding user to role:', {
					   message: errorMessage,
					   stack: error?.stack,
					   error: error
				   });
				   toast({
					   title: "Failed to Add User",
					   description: errorMessage,
					   variant: "destructive",
				   });
				   return; // Prevent any further error propagation
			   }
		   } finally {
			   setAdding(false);
		   }
	}

	async function handleRemove(userId: string) {
		   if (!session?.user?.id) return;
		   setAdding(true);
		   try {
			   // Capture user before removing from state
			   const targetUser = users.find((u) => u.discordUserId === userId) || {};
			   await removeRole(guildId, userId, roleId, session.user.id);

			   // Success - update UI optimistically and log action
			   setUsers((prev) => prev.filter((u) => u.discordUserId !== userId));

			   // Logging
			   const actor = session.user.id;
			   const actorUsername = session.user.name || (session.user as any).username || session.user.id;
			   logAction({
				   guildId,
				   userId: actor,
				   actionType: "role.remove",
				   user: { id: actor, username: actorUsername },
				   actionData: {
					   targetUser: userId,
					   targetUsername: targetUser.username,
					   role: roleId,
					   roleName: roleName,
					   source: "role-users-list"
				   }
			   });

			   toast({
				   title: "User Removed",
				   description: `${targetUser.username} has been removed from ${roleName || 'the role'}.`,
			   });

			   // Note: No need to refresh member data for remove operations
			   // The optimistic update above handles the UI immediately
		   } catch (error: any) {
			   // Ensure error is properly handled and doesn't bubble up
			   const errorMessage = error?.message || error?.toString() || 'Unknown error';

			   // For expected errors (hierarchy/permission issues), only log minimal info
			   if (errorMessage.includes('hierarchy') || errorMessage.includes('permission') || errorMessage.includes('higher') || errorMessage.includes('cannot assign roles') || errorMessage.includes('uneditable_role')) {
				   console.log('[ROLE-USERS-LIST] Role removal blocked (expected):', errorMessage);
				   
				   // Provide friendly error messages for common issues
				   let friendlyMessage = errorMessage;
			   if (errorMessage.toLowerCase().includes('hierarchy') || errorMessage.toLowerCase().includes('higher') || errorMessage.toLowerCase().includes('position')) {
				   friendlyMessage = "❌ Bot's role is not high enough in the server hierarchy to remove this role. Move the bot's role above the target role in Server Settings > Roles.";
				   } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('manage_roles')) {
					   friendlyMessage = "❌ Bot lacks 'Manage Roles' permission. Grant this permission in Server Settings > Roles.";
				   } else if (errorMessage.toLowerCase().includes('cannot assign roles')) {
					   friendlyMessage = "❌ Bot cannot remove this role due to permission restrictions.";
				   } else if (errorMessage.toLowerCase().includes('uneditable_role')) {
					   friendlyMessage = "❌ This role cannot be assigned/removed. It may be a managed role (from a bot or integration) or have special restrictions.";
				   }
				   
				   toast({
					   title: "Role Removal Blocked",
					   description: friendlyMessage,
					   variant: "destructive",
				   });
				   return; // Prevent any further error propagation
			   } else {
				   // For unexpected errors, log full details for debugging
				   console.error('[ROLE-USERS-LIST] Unexpected error removing user from role:', {
					   message: errorMessage,
					   stack: error?.stack,
					   error: error
				   });
				   toast({
					   title: "Failed to Remove User",
					   description: errorMessage,
					   variant: "destructive",
				   });
				   return; // Prevent any further error propagation
			   }
		   } finally {
			   setAdding(false);
		   }
	}

	return (
		<div className="bg-white rounded-xl border border-gray-200 p-4 shadow-md hover:shadow-lg transition-all duration-200">
			<div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
				<div className="flex-1">
					<input
						className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
						placeholder="Search users in this role..."
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>
				<button
					className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 min-w-[120px]"
					onClick={() => setAddModalOpen(true)}
					disabled={adding}
					title="Add user"
					aria-label="Add user"
					type="button"
				>
					<span className="text-lg font-bold">+</span>
					<span className="text-sm">Add User</span>
				</button>
			</div>
			<Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} className="fixed z-[200] inset-0 flex items-center justify-center">
				<div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" onClick={() => setAddModalOpen(false)} />
				<div
					className="relative rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto z-10 border border-white/20"
					style={{
						background: 'rgba(255, 255, 255, 0.95)',
						color: '#111827',
						boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
						backdropFilter: 'blur(16px)',
						WebkitBackdropFilter: 'blur(16px)'
					}}
				>
					<Dialog.Title className="text-xl font-bold mb-4 text-gray-900">Add user to role</Dialog.Title>
					<div className="mb-4">
						<input
							type="text"
							className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white/80 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm"
							placeholder="Search users by name or Discord ID..."
							value={userSearch}
							onChange={e => setUserSearch(e.target.value)}
							autoFocus
						/>
					</div>
					<div className="max-h-60 overflow-y-auto mb-4 bg-gray-50/50 rounded-xl border border-gray-100">
						{addResults.filter(u =>
							u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
							(u.accountid && u.accountid.toLowerCase().includes(userSearch.toLowerCase()))
						).map(u => (
							<div
								key={u.discordUserId}
								className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
									selectedUserId === u.discordUserId
										? 'bg-blue-50 border-blue-200'
										: 'hover:bg-white/60'
								}`}
								onClick={() => setSelectedUserId(u.discordUserId)}
							>
								<img src={u.avatarUrl || DEFAULT_AVATAR} alt={u.username} className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover" />
								<div className="flex-1 min-w-0">
									<span className="block text-sm font-medium text-gray-900 truncate">{u.username}</span>
									{u.accountid && <span className="block text-xs text-gray-500 truncate">{u.accountid}</span>}
								</div>
								<div className="text-xs text-gray-400 font-mono">
									{u.discordUserId}
								</div>
								{selectedUserId === u.discordUserId && (
									<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
								)}
							</div>
						))}
						{addResults.filter(u =>
							u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
							(u.accountid && u.accountid.toLowerCase().includes(userSearch.toLowerCase()))
						).length === 0 && (
							<div className="text-sm text-gray-500 px-4 py-6 text-center">No users found</div>
						)}
					</div>
					<div className="flex gap-3">
						<button
							className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
							disabled={!selectedUserId || adding}
							onClick={async () => {
								if (!selectedUserId) return;
								await handleAdd(selectedUserId);
							}}
						>
							{adding ? (
								<div className="flex items-center justify-center gap-2">
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
									<span>Adding...</span>
								</div>
							) : (
								'Add User'
							)}
						</button>
						<button
							className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300"
							onClick={() => setAddModalOpen(false)}
							disabled={adding}
						>
							Cancel
						</button>
					</div>
				</div>
			</Dialog>
			{loading ? (
				<div className="flex items-center justify-center py-3">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
						<span className="text-xs text-gray-600">Loading users...</span>
					</div>
				</div>
			) : users.length === 0 ? (
				<div className="text-center py-3">
					<div className="text-gray-400 mb-1">
						<svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<div className="text-xs text-gray-500">No users in this role</div>
				</div>
			) : (
				<div className="bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">
					<ul className="divide-y divide-gray-100">
						{users.map((u) => (
							<li key={u.discordUserId} className="flex gap-3 py-2 px-3 hover:bg-white/60 transition-all duration-150 items-center group">
								<img
									src={u.avatarUrl || DEFAULT_AVATAR}
									alt={u.username}
									className="w-6 h-6 rounded-full border border-white shadow-sm object-cover"
								/>
								<div className="min-w-0 flex-1">
									<div className="font-semibold text-xs text-gray-900 truncate">{u.username}</div>
									{u.accountid && <div className="text-xs text-gray-500 truncate">{u.accountid}</div>}
								</div>
								<button
									className="ml-auto bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-md transition-all duration-200 border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
									onClick={() => handleRemove(u.discordUserId)}
									disabled={adding}
									title="Remove user"
								>
									{adding ? (
										<div className="flex items-center gap-1">
											<div className="w-2.5 h-2.5 border border-red-300 border-t-red-600 rounded-full animate-spin"></div>
											<span className="text-xs">Removing...</span>
										</div>
									) : (
										<span className="text-xs">Remove</span>
									)}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

