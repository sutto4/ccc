"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, Filter, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { fetchMembers, fetchRoles, fetchExternalGroups } from "@/lib/api"
import type { ExternalGroup, GuildMember, GuildRole } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function UsersRolesPage({ params }: { params: { id: string } }) {
  const guildId = params.id
  const [q, setQ] = useState("")
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState<"add" | "remove">("add")
  const { toast } = useToast()

  const { data: roles, isLoading: loadingRoles } = useQuery<GuildRole[]>({
    queryKey: ["roles", guildId],
    queryFn: () => fetchRoles(guildId),
  })

  const { data: groups } = useQuery<ExternalGroup[]>({
    queryKey: ["groups"],
    queryFn: () => fetchExternalGroups(),
  })

  const { data: members, isLoading } = useQuery<GuildMember[]>({
    queryKey: ["members", guildId, q, selectedRoleIds, selectedGroups],
    queryFn: () => fetchMembers(guildId, { q, role: selectedRoleIds, group: selectedGroups }),
  })

  const allSelected = useMemo(() => {
    const ids = new Set(selectedMembers)
    return members?.length && members.every((m) => ids.has(m.discordUserId))
  }, [selectedMembers, members])

  const toggleSelectAll = () => {
    if (!members) return
    if (allSelected) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map((m) => m.discordUserId))
    }
  }

  const pendingChanges = useMemo(
    () =>
      selectedMembers.map((id) => ({
        memberId: id,
        action: bulkMode,
        roles: selectedRoleIds,
      })),
    [selectedMembers, bulkMode, selectedRoleIds],
  )

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle>Users & Roles</CardTitle>
            <p className="text-muted-foreground text-sm">
              Search, filter, and bulk manage roles. Cross-filter by external groups.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by username, Discord ID, or accountid"
                className="pl-8 w-72"
                aria-label="Search members"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Discord roles</Label>
                    <ScrollArea className="h-40 mt-2 rounded-md border p-2">
                      <div className="grid gap-2">
                        {loadingRoles ? (
                          <div className="text-sm text-muted-foreground">Loading roles…</div>
                        ) : (
                          roles?.map((r) => (
                            <label key={r.roleId} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selectedRoleIds.includes(r.roleId)}
                                onCheckedChange={(c) =>
                                  setSelectedRoleIds((prev) =>
                                    c ? [...prev, r.roleId] : prev.filter((id) => id !== r.roleId),
                                  )
                                }
                              />
                              <span className="inline-flex items-center gap-2">
                                <span
                                  aria-hidden
                                  className="inline-block size-3 rounded"
                                  style={{ backgroundColor: r.color ?? "#999999" }}
                                />
                                {r.name}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">External groups</Label>
                    <ScrollArea className="h-40 mt-2 rounded-md border p-2">
                      <div className="grid gap-2">
                        {groups?.map((g) => (
                          <label key={`${g.accountid}:${g.group}`} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedGroups.includes(g.group)}
                              onCheckedChange={(c) =>
                                setSelectedGroups((prev) =>
                                  c ? [...prev, g.group] : prev.filter((s) => s !== g.group),
                                )
                              }
                            />
                            <span>{g.group}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {selectedRoleIds.map((r) => {
                const roleName = roles?.find((x) => x.roleId === r)?.name ?? r
                return (
                  <Badge key={r} variant="secondary">
                    Role: {roleName}
                  </Badge>
                )
              })}
              {selectedGroups.map((g) => (
                <Badge key={g} variant="outline">
                  Group: {g}
                </Badge>
              ))}
              {(selectedGroups.length > 0 || selectedRoleIds.length > 0 || q) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ("")
                    setSelectedGroups([])
                    setSelectedRoleIds([])
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="mode" className="text-sm">
                Bulk Action
              </Label>
              <div className="inline-flex overflow-hidden rounded-md border">
                <Button
                  variant={bulkMode === "add" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setBulkMode("add")}
                  className={cn(bulkMode === "add" && "pointer-events-none")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
                <Button
                  variant={bulkMode === "remove" ? "destructive" : "ghost"}
                  size="sm"
                  onClick={() => setBulkMode("remove")}
                  className={cn(bulkMode === "remove" && "pointer-events-none")}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <label className="flex items-center gap-2">
                      <Checkbox aria-label="Select all" checked={!!allSelected} onCheckedChange={toggleSelectAll} />
                    </label>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Discord Roles</TableHead>
                  <TableHead>accountid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading members…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : members?.length ? (
                  members.map((m) => (
                    <TableRow key={m.discordUserId} data-selected={selectedMembers.includes(m.discordUserId)}>
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${m.username}`}
                          checked={selectedMembers.includes(m.discordUserId)}
                          onCheckedChange={(c) =>
                            setSelectedMembers((prev) =>
                              c ? [...prev, m.discordUserId] : prev.filter((id) => id !== m.discordUserId),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{m.username}</span>
                          <span className="text-xs text-muted-foreground">{m.discordUserId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {m.roleIds.map((r) => {
                            const role = roles?.find((x) => x.roleId === r)
                            return (
                              <Badge key={r} variant="outline" className="flex items-center gap-1">
                                <span
                                  aria-hidden
                                  className="inline-block size-2 rounded"
                                  style={{ backgroundColor: role?.color ?? "#999999" }}
                                />
                                {role?.name ?? r}
                              </Badge>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{m.accountid ?? "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No results
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedMembers.length}</span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={selectedMembers.length === 0 || selectedRoleIds.length === 0}>
                Preview audit ({pendingChanges.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Review changes</DialogTitle>
                <DialogDescription>
                  The following actions will be recorded in the audit log and queued for processing.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] overflow-y-auto space-y-3">
                {pendingChanges.map((c) => (
                  <div key={`${c.memberId}-${c.action}`} className="rounded-md border p-3">
                    <div className="text-sm">
                      Member: <span className="font-mono">{c.memberId}</span>
                    </div>
                    <div className="text-sm">
                      Action:{" "}
                      <Badge variant={c.action === "add" ? "default" : "destructive"} className="capitalize">
                        {c.action} roles
                      </Badge>
                    </div>
                    <div className="text-sm">
                      Roles: <span className="font-mono">{c.roles.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    toast({
                      title: "Changes queued",
                      description:
                        "Role changes have been queued. This is a demo; no requests were sent. An audit entry was created.",
                    })
                    // no-op: in real app, POST to API and then refetch
                    setSelectedMembers([])
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  )
}
