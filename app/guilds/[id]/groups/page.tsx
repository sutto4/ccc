"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchExternalGroups } from "@/lib/api"
import type { ExternalGroup } from "@/lib/types"

export default function GroupsPage() {
  const { data } = useQuery<ExternalGroup[]>({
    queryKey: ["external-groups"],
    queryFn: () => fetchExternalGroups(),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>External Groups (read-only)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Backed by fivem_live.account_groups (mapped via Prisma). Source metadata is shown below.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>accountid</TableHead>
                <TableHead>group</TableHead>
                <TableHead>assigned_on</TableHead>
                <TableHead>assigned_by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((r, i) => (
                <TableRow key={`${r.accountid}-${r.group}-${i}`}>
                  <TableCell>{r.accountid}</TableCell>
                  <TableCell>{r.group}</TableCell>
                  <TableCell>{r.assigned_on}</TableCell>
                  <TableCell>{r.assigned_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
