"use client"

import { useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getMockGuildById } from "@/lib/data"
import InviteBotButton from "@/components/invite-bot-button"

export default function SettingsPage({ params }: { params: { id: string } }) {
  const guild = useMemo(() => getMockGuildById(params.id), [params.id])
  if (!guild) return null

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Discord Bot</div>
              <div className="text-sm text-muted-foreground">Status: Connected (demo)</div>
            </div>
            <InviteBotButton size="sm" variant="outline" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Premium Plan</div>
              <div className="text-sm text-muted-foreground">
                {guild.premium ? "Premium features enabled" : "Free plan (upgrade later)"}
              </div>
            </div>
            <Badge variant={guild.premium ? "default" : "secondary"}>{guild.premium ? "Premium" : "Free"}</Badge>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled>Save changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
