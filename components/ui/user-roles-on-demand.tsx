import { useState } from "react";
import { fetchRoles } from "@/lib/api";

export function UserRolesOnDemand({ guildId, roleIds }: { guildId: string; roleIds: string[] }) {
  const [roles, setRoles] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleShow = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchRoles(guildId);
      setRoles(all.filter((r: any) => roleIds.includes(r.roleId)));
    } catch (e: any) {
      setError(e.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };
  if (roles) {
    return roles.length === 0 ? <span className="text-muted-foreground">none</span> : (
      <div className="flex flex-wrap items-center gap-1 justify-center">
        {roles.map((r) => (
          <span
            key={r.roleId}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ backgroundColor: r.color ? `${r.color}20` : undefined, borderColor: r.color || undefined }}
            title={r.roleId}
          >
            {r.name}
          </span>
        ))}
      </div>
    );
  }
  return (
    <button className="rounded border px-2 py-1 text-xs bg-muted hover:bg-muted/70 transition" onClick={handleShow} disabled={loading}>
      {loading ? "Loading..." : "Show Roles"}
    </button>
  );
}
