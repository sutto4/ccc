
import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { fetchMembersPaged, fetchMembersLegacy, addRole, removeRole } from "@/lib/api";

const DEFAULT_AVATAR = "/placeholder-user.jpg";

export default function RoleUsersList({ guildId, roleId }: { guildId: string; roleId: string }) {
		const [users, setUsers] = useState<any[]>([]);
		const [allMembers, setAllMembers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [userSearch, setUserSearch] = useState("");
	const [addResults, setAddResults] = useState<any[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [adding, setAdding] = useState(false);
	const { data: session } = useSession();

		useEffect(() => {
			setLoading(true);
			fetchMembersPaged(guildId, { role: roleId, q: search, limit: 50 })
				.then((res) => setUsers(res.members || []))
				.finally(() => setLoading(false));
			// Fetch all members for add modal (like Kanban)
			fetchMembersLegacy(guildId).then(setAllMembers);
		}, [guildId, roleId, search]);

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
			setUsers((prev) => [...prev, addResults.find((u) => u.discordUserId === userId)]);
			setAddModalOpen(false);
			setUserSearch("");
			setAddResults([]);
			setSelectedUserId("");
		} finally {
			setAdding(false);
		}
	}

	async function handleRemove(userId: string) {
		if (!session?.user?.id) return;
		setAdding(true);
		try {
			await removeRole(guildId, userId, roleId, session.user.id);
			setUsers((prev) => prev.filter((u) => u.discordUserId !== userId));
		} finally {
			setAdding(false);
		}
	}

	return (
		<div className="rounded-xl border bg-card p-4 shadow-sm">
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
				<input
					className="w-full sm:max-w-xs rounded-md border px-3 py-2 text-sm bg-background"
					placeholder="Search users in this role..."
					value={search}
					onChange={e => setSearch(e.target.value)}
				/>
				<button
					className="ml-2 rounded-full border border-transparent p-0.5 w-7 h-7 flex items-center justify-center bg-transparent text-primary transition disabled:opacity-50"
					onClick={() => setAddModalOpen(true)}
					disabled={adding}
					title="Add user"
					aria-label="Add user"
					type="button"
					style={{ transition: 'background 0.15s, color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
					onMouseEnter={e => {
						e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
						e.currentTarget.style.color = '#111827';
					}}
					onMouseLeave={e => {
						e.currentTarget.style.background = 'transparent';
						e.currentTarget.style.color = '';
					}}
				>
					<span className="text-lg font-bold flex items-center justify-center w-full h-full" style={{lineHeight: 1}}>+</span>
				</button>
			</div>
			<Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)} className="fixed z-[200] inset-0 flex items-center justify-center">
				<div className="fixed inset-0 bg-black/10" aria-hidden="true" onClick={() => setAddModalOpen(false)} />
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
									{addResults.filter(u =>
										u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
										(u.accountid && u.accountid.toLowerCase().includes(userSearch.toLowerCase()))
									).map(u => (
										<div
											key={u.discordUserId}
											className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selectedUserId === u.discordUserId ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
											onClick={() => setSelectedUserId(u.discordUserId)}
										>
											<img src={u.avatarUrl || DEFAULT_AVATAR} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
											<span className="truncate text-xs font-medium text-black">{u.username}</span>
											{u.accountid && <span className="ml-auto text-xs text-gray-500">{u.accountid}</span>}
											<span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
										</div>
									))}
									{addResults.filter(u =>
										u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
										(u.accountid && u.accountid.toLowerCase().includes(userSearch.toLowerCase()))
									).length === 0 && (
										<div className="text-xs text-gray-400 px-2 py-2">No users found</div>
									)}
								</div>
					<div className="flex gap-2">
						<button
							className="flex-1 rounded bg-blue-600 text-white py-1 font-semibold text-xs shadow hover:bg-blue-700 transition disabled:opacity-50"
							disabled={!selectedUserId || adding}
							onClick={async () => {
								if (!selectedUserId) return;
								await handleAdd(selectedUserId);
							}}
						>Add</button>
						<button
							className="flex-1 rounded border py-1 text-xs font-semibold hover:bg-gray-100 text-gray-700 border-gray-300 transition"
							onClick={() => setAddModalOpen(false)}
							disabled={adding}
						>Cancel</button>
					</div>
				</div>
			</Dialog>
			{loading ? (
				<div className="text-xs text-muted-foreground">Loading users…</div>
			) : users.length === 0 ? (
				<div className="text-xs text-muted-foreground">No users in this role.</div>
			) : (
				<ul className="divide-y divide-border bg-background rounded-md">
					{users.map((u) => (
						<li key={u.discordUserId} className="flex gap-3 py-2 px-1 hover:bg-accent/40 transition items-center">
							<img
								src={u.avatarUrl || DEFAULT_AVATAR}
								alt={u.username}
								className="w-7 h-7 rounded-full border bg-muted object-cover"
							/>
							<div className="min-w-0 flex-1 flex flex-col justify-center">
								<div className="font-medium text-xs truncate">{u.username}</div>
								{u.accountid && <div className="text-[10px] text-muted-foreground truncate">{u.accountid}</div>}
							</div>
							<button
								className="ml-auto rounded-full border border-transparent p-0.5 w-7 h-7 flex items-center justify-center bg-transparent text-muted-foreground transition disabled:opacity-50"
								onClick={() => handleRemove(u.discordUserId)}
								disabled={adding}
								title="Remove user"
								style={{ marginLeft: 'auto', transition: 'background 0.15s, color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
								onMouseEnter={e => {
									e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
									e.currentTarget.style.color = '#111827';
								}}
								onMouseLeave={e => {
									e.currentTarget.style.background = 'transparent';
									e.currentTarget.style.color = '';
								}}
							>
								<span className="text-lg font-bold flex items-center justify-center w-full h-full">×</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

