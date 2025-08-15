"use client";
import { useState } from "react";
import { type Role } from "@/lib/api";
import { CheckIcon } from "lucide-react";

export default function RoleMultiPicker({
  roles = [],
  value = [],
  onChange,
  disabled = false,
}: {
  roles: Role[];
  value?: Role[];
  onChange: (roles: Role[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.roleId.includes(query)
  );

  function toggleRole(role: Role) {
    if (value.some((r) => r.roleId === role.roleId)) {
      onChange(value.filter((r) => r.roleId !== role.roleId));
    } else {
      onChange([...value, role]);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex items-center gap-2">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.map((r) => (
              <span
                key={r.roleId}
                className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-2 py-1 text-xs border border-primary/20"
              >
                {r.name}
                <button
                  type="button"
                  className="ml-1 text-xs text-red-400 hover:text-red-600"
                  onClick={() => toggleRole(r)}
                  tabIndex={-1}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Search roles by name or ID..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
      />
      <div className="flex-1 min-h-0 overflow-y-auto rounded border bg-card text-foreground">
        {filtered.map((r) => (
          <div
            key={r.roleId}
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-primary/10 ${
              value.some((sel) => sel.roleId === r.roleId) ? "bg-primary/20" : ""
            } text-foreground`}
            onClick={() => toggleRole(r)}
          >
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: r.color || "#e5e7eb", borderColor: r.color || "#e5e7eb" }}
            />
            <span className="truncate text-xs font-medium">
              {r.name}
            </span>
            <span className="ml-auto text-xs text-gray-500">{r.roleId}</span>
            {value.some((sel) => sel.roleId === r.roleId) && (
              <CheckIcon className="w-4 h-4 text-green-500" />
            )}
          </div>
        ))}
        {query && filtered.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-2">No roles found</div>
        )}
      </div>
    </div>
  );
}
