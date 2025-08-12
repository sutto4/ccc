"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchRoles } from "@/lib/api"
import type { GuildRole } from "@/lib/types"

export default function RolesPage({ params }: { params: { id: string } }) {
  const guildId = params.id
  const { data: roles, isLoading } = useQuery<GuildRole[]>({
    queryKey: ["roles", guildId],
    queryFn: () => fetchRoles(guildId),
  })

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading roles…</div>
          ) : roles?.length ? (
            <ul className="grid gap-2">
              {roles.map((r) => (
                <li key={r.roleId} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded"
                    style={{ backgroundColor: r.color ?? "#999999" }}
                  />
                  {r.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">No roles found</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
