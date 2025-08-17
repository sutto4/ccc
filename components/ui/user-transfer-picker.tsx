"use client";
import { useEffect, useState } from "react";
import { fetchMembersLegacy, type Member, type Role } from "@/lib/api";
import { CheckIcon, ChevronRight, ChevronLeft } from "lucide-react";

export default function UserTransferPicker({
  guildId,
  value = [],
  onChange,
  disabled = false,
  roles = [],
}: {
  guildId: string;
  value?: Member[];
  onChange: (users: Member[]) => void;
  disabled?: boolean;
  roles?: Role[];
}) {
  const [allUsers, setAllUsers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMembersLegacy(guildId)
      .then((members) => setAllUsers(members))
      .finally(() => setLoading(false));
  }, [guildId]);

  // Enhanced search function that searches by username, user ID, and role names
  const searchUsers = (users: Member[], searchTerm: string) => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    
    return users.filter(user => {
      // Search by username
      if (user.username.toLowerCase().includes(term)) return true;
      
      // Search by user ID
      if (user.discordUserId.toLowerCase().includes(term)) return true;
      
      // Search by role names - check if any of the user's roles contain the search term
      if (user.roleIds.some(roleId => {
        const role = roles?.find(r => r.roleId === roleId);
        return role?.name.toLowerCase().includes(term);
      })) return true;
      
      return false;
    });
  };

  const available = searchUsers(
    allUsers.filter(u => !value.some(sel => sel.discordUserId === u.discordUserId)),
    search
  );

  return (
    <div className="flex gap-4 w-full flex-1 min-h-0">
      {/* Available users */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="mb-2 font-medium flex items-center justify-between">
          <span>Available Users</span>
          {search.trim() && (
            <span className="text-xs text-muted-foreground">
              {available.length} found
            </span>
          )}
        </div>
        <input
          className="w-full rounded border px-3 py-2 text-sm mb-2"
          placeholder="Search by username, user ID, or role (e.g., 'Moderator')..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <div className="text-xs text-muted-foreground mb-2">
          Tip: Type a role name like "Moderator" to find all users with that role
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto rounded border bg-card text-foreground">
          {loading ? (
            <div className="text-xs text-muted-foreground px-2 py-2">Loading...</div>
          ) : available.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              {search.trim() ? `No users found matching "${search}"` : 'No users found'}
            </div>
          ) : (
            available.map((u) => {
              // Find which role matched the search (if any)
              const matchedRole = search.trim() ? u.roleIds.find(roleId => {
                const role = roles?.find(r => r.roleId === roleId);
                return role?.name.toLowerCase().includes(search.toLowerCase());
              }) : null;
              const matchedRoleName = matchedRole ? roles?.find(r => r.roleId === matchedRole)?.name : null;
              
              return (
                <div
                  key={u.discordUserId}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-primary/10"
                  onClick={() => onChange([...value, u])}
                >
                  <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-xs font-medium block">{u.username}</span>
                    {matchedRoleName && (
                      <span className="text-xs text-blue-600 block">Role: {matchedRoleName}</span>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })
          )}
        </div>
      </div>
      {/* Selected users */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="mb-2 font-medium">Selected Users</div>
        <div className="flex-1 min-h-0 overflow-y-auto rounded border bg-card text-foreground">
          {value.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">No users selected</div>
          ) : (
            value.map((u) => (
              <div
                key={u.discordUserId}
                className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-red-50"
                onClick={() => onChange(value.filter((sel) => sel.discordUserId !== u.discordUserId))}
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                <span className="truncate text-xs font-medium">{u.username}</span>
                <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                <CheckIcon className="w-4 h-4 text-green-500" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
