"use client";
import { useEffect, useState } from "react";
import { fetchMembersLegacy, type Member } from "@/lib/api";
import { CheckIcon, ChevronRight, ChevronLeft } from "lucide-react";

export default function UserTransferPicker({
  guildId,
  value = [],
  onChange,
  disabled = false,
}: {
  guildId: string;
  value?: Member[];
  onChange: (users: Member[]) => void;
  disabled?: boolean;
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

  const available = allUsers.filter(
    (u) => !value.some((sel) => sel.discordUserId === u.discordUserId) &&
      (search === "" || u.username.toLowerCase().includes(search.toLowerCase()) || u.discordUserId.includes(search))
  );

  return (
    <div className="flex gap-4 w-full">
      {/* Available users */}
      <div className="flex-1 min-w-0">
        <div className="mb-2 font-medium">Available Users</div>
        <input
          className="w-full rounded border px-3 py-2 text-sm mb-2"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <div className="max-h-40 overflow-y-auto rounded border bg-card text-foreground">
          {loading ? (
            <div className="text-xs text-muted-foreground px-2 py-2">Loading...</div>
          ) : available.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">No users found</div>
          ) : (
            available.map((u) => (
              <div
                key={u.discordUserId}
                className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-primary/10"
                onClick={() => onChange([...value, u])}
              >
                <img src={u.avatarUrl || "/placeholder-user.jpg"} alt={u.username} className="w-6 h-6 rounded-full border bg-muted object-cover" />
                <span className="truncate text-xs font-medium">{u.username}</span>
                <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))
          )}
        </div>
      </div>
      {/* Selected users */}
      <div className="flex-1 min-w-0">
        <div className="mb-2 font-medium">Selected Users</div>
        <div className="max-h-48 overflow-y-auto rounded border bg-card text-foreground">
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
