import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getMockGuildById, getMockGuildStats } from "@/lib/data"
import { Sparkles, Users, Shield, ListChecks } from "lucide-react"

export default function GuildOverviewPage({ params }: { params: { id: string } }) {
  const guild = getMockGuildById(params.id)
  const stats = getMockGuildStats(params.id)
  if (!guild) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.members.toLocaleString()}</div>
          <p className="text-muted-foreground text-sm">Total members</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.roles}</div>
          <p className="text-muted-foreground text-sm">Configured roles</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.changes}</div>
          <p className="text-muted-foreground text-sm">Last 24h</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          {guild.premium ? (
            <Badge variant="default">Premium Enabled</Badge>
          ) : (
            <Badge variant="secondary">Free plan</Badge>
          )}
          <p className="text-muted-foreground text-sm mt-2">Stripe integration scaffolded (coming later).</p>
        </CardContent>
      </Card>
    </div>
  )
}
