"use client";
import { useState } from "react";
import { searchMembers, type Member, type Role } from "@/lib/api";
import { CheckIcon } from "lucide-react";

export default function UserMultiPicker({
  guildId,
  onChange,
  value = [],
  disabled = false,
}: {
  guildId: string;
  value?: Member[];
  onChange: (users: Member[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const found = await searchMembers(guildId, q, 10);
      setResults(found);
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(user: Member) {
    if (value.some((u) => u.discordUserId === user.discordUserId)) {
      onChange(value.filter((u) => u.discordUserId !== user.discordUserId));
    } else {
      onChange([...value, user]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Search users by name or Discord ID..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        disabled={disabled}
      />
      {loading && <div className="text-xs text-muted-foreground">Searching...</div>}
  <div className="max-h-40 overflow-y-auto rounded border bg-card text-foreground">
        {results.map((u) => (
          <div
            key={u.discordUserId}
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-primary/10 ${
              value.some((sel) => sel.discordUserId === u.discordUserId)
                ? "bg-primary/20"
                : ""
            } text-foreground`}
            onClick={() => toggleUser(u)}
          >
            <img
              src={u.avatarUrl || "/placeholder-user.jpg"}
              alt={u.username}
              className="w-6 h-6 rounded-full border bg-muted object-cover"
            />
            <span className="truncate text-xs font-medium">
              {u.username}
            </span>
            <span className="ml-auto text-xs text-gray-500">{u.discordUserId}</span>
            {value.some((sel) => sel.discordUserId === u.discordUserId) && (
              <CheckIcon className="w-4 h-4 text-green-500" />
            )}
          </div>
        ))}
        {query && !loading && results.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-2">No users found</div>
        )}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((u) => (
            <span
              key={u.discordUserId}
              className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary border border-primary/20"
            >
              {u.username}
              <button
                type="button"
                className="ml-1 text-xs text-red-500 hover:text-red-700"
                onClick={() => toggleUser(u)}
                tabIndex={-1}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
